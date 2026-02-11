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
    const userId = getUserIdFromRequest(request)
    const record = await prisma.breeding.create({
      data: body,
      include: {
        mother: true,
        father: true
      }
    })

    // إنشاء حدث تزاوج في التقويم
    const prismaAny = prisma as any
    try {
      await prismaAny.calendarEvent.create({
        data: {
          eventType: 'BREEDING',
          title: `تزاوج: ${record.mother.tagId} + ${record.father.tagId}`,
          description: `سجل تكاثر رقم ${record.id}`,
          date: record.matingDate,
          goatId: record.motherId,
          createdBy: userId
        }
      })

      // إنشاء حدث ولادة متوقعة إذا كان هناك تاريخ استحقاق
      if (record.dueDate) {
        await prismaAny.calendarEvent.create({
          data: {
            eventType: 'BIRTH',
            title: `ولادة متوقعة: ${record.mother.tagId}`,
            description: `ولادة متوقعة من سجل التكاثر رقم ${record.id}`,
            date: record.dueDate,
            goatId: record.motherId,
            reminder: true,
            createdBy: userId
          }
        })
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
    return NextResponse.json({ error: 'فشل في إضافة سجل التكاثر' }, { status: 500 })
  }
}
