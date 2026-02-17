import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_breeding')
    if (auth.response) return auth.response

    const records = await prisma.breeding.findMany({
      include: {
        mother: true,
        father: true,
        births: true
      },
      orderBy: { matingDate: 'desc' }
    })
    
    return NextResponse.json(records)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب سجلات التكاثر' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'add_breeding')
    if (auth.response) return auth.response

    const body = await request.json()
    const userId = await getUserIdFromRequest(request)

    if (!body?.motherId || !body?.fatherId) {
      return NextResponse.json({ error: 'يجب اختيار الأم والأب' }, { status: 400 })
    }

    if (body.motherId === body.fatherId) {
      return NextResponse.json({ error: 'لا يمكن أن تكون الأم والأب نفس الحيوان' }, { status: 400 })
    }

    const [mother, father] = await Promise.all([
      prisma.goat.findUnique({ where: { id: body.motherId }, select: { id: true, tagId: true, gender: true } }),
      prisma.goat.findUnique({ where: { id: body.fatherId }, select: { id: true, tagId: true, gender: true } })
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
            error: `لا يمكن إضافة سجل جديد: الأنثى ${mother.tagId} لديها سجل نشط (${existingActive.pregnancyStatus}) مع الأب ${existingActive.father.tagId}`
          },
          { status: 400 }
        )
      }
    }

    const record = await prisma.breeding.create({
      data: body,
      include: {
        mother: true,
        father: true
      }
    })

    // إنشاء حدث تزاوج في التقويم    try {
      await prisma.calendarEvent.create({
        data: {
          eventType: 'BREEDING',
          title: `تزاوج: ${record.mother.tagId} + ${record.father.tagId}`,
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
      description: `تم إنشاء سجل تكاثر (${record.mother.tagId} + ${record.father.tagId})`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })
    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('Breeding create error:', error)
    return NextResponse.json({ error: 'فشل في إضافة سجل التكاثر' }, { status: 500 })
  }
}
