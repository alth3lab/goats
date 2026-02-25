import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, getUserIdFromRequest } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'
import { logActivity } from '@/lib/activityLogger'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_feeds')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const searchParams = request.nextUrl.searchParams
    const penId = searchParams.get('penId')
    const isActive = searchParams.get('isActive')

    const where: Record<string, unknown> = {}
    if (penId) where.penId = penId
    // LO-05: Fix isActive filter — searchParams.get returns string or null
    if (searchParams.has('isActive')) where.isActive = isActive === 'true'

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
  
    })
} catch (error) {
    console.error('Error fetching schedules:', error)
    return NextResponse.json({ error: 'فشل في جلب جداول التغذية' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'add_feed')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const body = await request.json()
    const userId = await getUserIdFromRequest(request)

    // Input validation (SEC-04)
    if (!body.feedTypeId) {
      return NextResponse.json({ error: 'نوع العلف مطلوب' }, { status: 400 })
    }
    const dailyAmount = Number(body.dailyAmount ?? body.quantity ?? 0)
    if (dailyAmount <= 0) {
      return NextResponse.json({ error: 'الكمية اليومية يجب أن تكون أكبر من صفر' }, { status: 400 })
    }
    if (body.endDate && body.startDate && new Date(body.endDate) < new Date(body.startDate)) {
      return NextResponse.json({ error: 'تاريخ الانتهاء لا يمكن أن يكون قبل تاريخ البدء' }, { status: 400 })
    }

    const createData = {
      feedTypeId: body.feedTypeId,
      penId: body.penId || null,
      quantity: dailyAmount,
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

    // Activity logging (CODE-03)
    await logActivity({
      userId: userId || undefined,
      action: 'CREATE',
      entity: 'FeedingSchedule',
      entityId: schedule.id,
      description: `إضافة جدول تغذية: ${schedule.feedType?.nameAr || ''} - ${schedule.pen?.nameAr || 'بدون حظيرة'}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json(schedule, { status: 201 })
  
    })
} catch (error) {
    console.error('Error creating schedule:', error)
    return NextResponse.json({ error: 'فشل في إضافة الجدول' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'manage_feeds')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    // يتطلب تأكيد صريح عبر body.confirm = true
    const body = await request.json().catch(() => ({}))
    if (!body?.confirm) {
      return NextResponse.json(
        { error: 'يجب تأكيد الحذف الجماعي عبر إرسال confirm: true', requireConfirm: true },
        { status: 400 }
      )
    }

    const userId = await getUserIdFromRequest(request)
    const deleted = await prisma.feedingSchedule.deleteMany({})

    await logActivity({
      userId: userId || undefined,
      action: 'DELETE',
      entity: 'FeedingSchedule',
      entityId: 'all-schedules',
      description: `حذف جميع جداول التغذية (${deleted.count})`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json({
      message: 'تم حذف جميع جداول التغذية بنجاح',
      deletedCount: deleted.count
    })
  
    })
} catch (error) {
    console.error('Error deleting all schedules:', error)
    return NextResponse.json({ error: 'فشل في حذف جميع الجداول' }, { status: 500 })
  }
}
