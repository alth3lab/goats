import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getUserIdFromRequest } from '@/lib/auth'
import { logActivity } from '@/lib/activityLogger'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response

    const searchParams = request.nextUrl.searchParams
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const eventType = searchParams.get('eventType')
    const completed = searchParams.get('completed')

    const where: any = {}
    
    if (start && end) {
      where.date = {
        gte: new Date(start),
        lte: new Date(end)
      }
    }
    
    if (eventType && eventType !== 'ALL') {
      where.eventType = eventType
    }
    
    if (completed !== null) {
      where.isCompleted = completed === 'true'
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { date: 'asc' }
    })

    return NextResponse.json(events)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب الأحداث' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response

    const body = await request.json()
    const userId = getUserIdFromRequest(request)

    const event = await prisma.calendarEvent.create({
      data: {
        ...body,
        createdBy: userId || undefined
      }
    })

    await logActivity({
      userId: userId || undefined,
      action: 'CREATE',
      entity: 'CalendarEvent',
      entityId: event.id,
      description: `إضافة حدث: ${event.title}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة الحدث' }, { status: 500 })
  }
}
