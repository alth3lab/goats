import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_breeding')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const records = await prisma.breeding.findMany({
      include: {
        mother: true,
        father: {
          include: { breed: true }
        },
        births: true
      },
      orderBy: { matingDate: 'desc' }
    })
    
    return NextResponse.json(records)
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في جلب سجلات التكاثر' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'add_breeding')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const body = await request.json()
    const userId = await getUserIdFromRequest(request)

    if (!body?.motherId) {
      return NextResponse.json({ error: 'يجب اختيار الأم' }, { status: 400 })
    }

    // Handle external sire: create a new EXTERNAL goat record
    let fatherId = body.fatherId
    if (!fatherId && body.externalSire) {
      const ext = body.externalSire
      if (!ext.name || !ext.breedId) {
        return NextResponse.json({ error: 'يجب إدخال اسم وسلالة الفحل الخارجي' }, { status: 400 })
      }
      // Get mother to determine farm/tenant context
      const motherForContext = await prisma.goat.findUnique({ where: { id: body.motherId }, select: { tenantId: true, farmId: true } })
      if (!motherForContext) {
        return NextResponse.json({ error: 'الأم غير موجودة' }, { status: 400 })
      }
      // Auto-generate tagId for external sire
      const extCount = await prisma.goat.count({ where: { status: 'EXTERNAL', tenantId: motherForContext.tenantId } })
      const autoTagId = `EXT-${String(extCount + 1).padStart(3, '0')}`
      const externalGoat = await prisma.goat.create({
        data: {
          tenantId: motherForContext.tenantId,
          farmId: motherForContext.farmId,
          tagId: ext.tagId || autoTagId,
          name: ext.name,
          breedId: ext.breedId,
          gender: 'MALE',
          birthDate: new Date('2020-01-01'),
          status: 'EXTERNAL',
          ownerName: ext.ownerName || null,
          ownerPhone: ext.ownerPhone || null,
          originFarm: ext.originFarm || null,
          sireLineage: ext.sireLineage || null,
          damLineage: ext.damLineage || null,
          notes: ext.notes || null,
        }
      })
      fatherId = externalGoat.id
    }

    if (!fatherId) {
      return NextResponse.json({ error: 'يجب اختيار الأب أو إضافة فحل خارجي' }, { status: 400 })
    }

    if (body.motherId === fatherId) {
      return NextResponse.json({ error: 'لا يمكن أن تكون الأم والأب نفس الحيوان' }, { status: 400 })
    }

    const [mother, father] = await Promise.all([
      prisma.goat.findUnique({ where: { id: body.motherId }, select: { id: true, tagId: true, gender: true } }),
      prisma.goat.findUnique({ where: { id: fatherId }, select: { id: true, tagId: true, gender: true } })
    ])

    if (!mother || !father) {
      return NextResponse.json({ error: 'الأم أو الأب غير موجود' }, { status: 400 })
    }

    if (mother.gender !== 'FEMALE') {
      return NextResponse.json({ error: `الحيوان ${mother.tagId} ليس أنثى` }, { status: 400 })
    }

    if (father.gender !== 'MALE') {
      return NextResponse.json({ error: `الحيوان ${father.tagId} ليس ذكراً` }, { status: 400 })
    }

    const nextStatus = body.pregnancyStatus || 'MATED'
    const activeStatuses = ['MATED', 'PREGNANT'] as const
    if (activeStatuses.includes(nextStatus)) {
      const existingActive = await prisma.breeding.findFirst({
        where: {
          motherId: body.motherId,
          pregnancyStatus: { in: [...activeStatuses] }
        },
        include: {
          father: { select: { tagId: true } }
        },
        orderBy: { matingDate: 'desc' }
      })

      if (existingActive) {
        return NextResponse.json(
          {
            error: `لا يمكن إضافة سجل جديد: الأنثى ${mother.tagId} لديها سجل نشط (${existingActive.pregnancyStatus}) مع الأب ${existingActive.father?.tagId || 'خارجي'}`
          },
          { status: 400 }
        )
      }
    }

    const record = await prisma.breeding.create({
      data: {
        motherId: body.motherId,
        fatherId,
        matingDate: body.matingDate,
        pregnancyStatus: body.pregnancyStatus || 'MATED',
        dueDate: body.dueDate || null,
        birthDate: body.birthDate || null,
        numberOfKids: body.numberOfKids || null,
        notes: body.notes || null,
      },
      include: {
        mother: true,
        father: true
      }
    })

    // إنشاء حدث تزاوج في التقويم
    try {
      await prisma.calendarEvent.create({
        data: {
          eventType: 'BREEDING',
          title: `تزاوج: ${record.mother.tagId} + ${record.father?.tagId || record.father?.name || 'خارجي'}`,
          description: `سجل تكاثر رقم ${record.id}`,
          date: record.matingDate,
          goatId: record.motherId,
          breedingId: record.id,
          createdBy: userId
        }
      })

      // إنشاء حدث ولادة متوقعة إذا كان هناك تاريخ استحقاق
      if (record.dueDate) {
        // التحقق من عدم وجود حدث ولادة مسبق لنفس سجل التكاثر
        const existingBirthEvent = await prisma.calendarEvent.findFirst({
          where: {
            breedingId: record.id,
            eventType: 'BIRTH'
          }
        })
        
        if (!existingBirthEvent) {
          await prisma.calendarEvent.create({
            data: {
              eventType: 'BIRTH',
              title: `ولادة متوقعة: ${record.mother.tagId}`,
              description: `ولادة متوقعة من سجل التكاثر رقم ${record.id}`,
              date: record.dueDate,
              goatId: record.motherId,
              breedingId: record.id,
              reminder: true,
              createdBy: userId
            }
          })
        }
      }
    } catch (calendarError) {
      console.error('Failed to create calendar event:', calendarError)
    }

    await logActivity({
      userId: userId || undefined,
      action: 'CREATE',
      entity: 'Breeding',
      entityId: record.id,
      description: `تم إنشاء سجل تكاثر (${record.mother.tagId} + ${record.father?.tagId || record.father?.name || 'فحل خارجي'})`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })
    return NextResponse.json(record, { status: 201 })
  
    })
} catch (error) {
    console.error('Breeding create error:', error)
    return NextResponse.json({ error: 'فشل في إضافة سجل التكاثر' }, { status: 500 })
  }
}
