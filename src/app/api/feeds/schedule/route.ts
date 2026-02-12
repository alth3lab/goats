import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_feeds')
    if (auth.response) return auth.response

    const searchParams = request.nextUrl.searchParams
    const penId = searchParams.get('penId')
    const isActive = searchParams.get('isActive')

    const where: any = {}
    if (penId) where.penId = penId
    if (isActive !== null) where.isActive = isActive === 'true'

    const schedules = await prisma.feedingSchedule.findMany({
      where,
      include: {
        feedType: true,
        pen: {
          include: {
            _count: {
              select: { goats: true }
            }
          }
        }
      },
      orderBy: { startDate: 'desc' }
    })

    return NextResponse.json(schedules)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب جداول التغذية' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'add_feed')
    if (auth.response) return auth.response

    const body = await request.json()
    const createData = {
      feedTypeId: body.feedTypeId,
      penId: body.penId || null,
      quantity: Number(body.dailyAmount ?? body.quantity ?? 0),
      frequency: Number(body.feedingTimes ?? body.frequency ?? 2),
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      endDate: body.endDate ? new Date(body.endDate) : null,
      isActive: body.isActive !== false,
      notes: body.notes || null
    }

    const schedule = await prisma.feedingSchedule.create({
      data: createData,
      include: {
        feedType: true,
        pen: true
      }
    })

    return NextResponse.json(schedule, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة الجدول' }, { status: 500 })
  }
}
