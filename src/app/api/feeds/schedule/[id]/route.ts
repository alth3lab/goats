import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, getUserIdFromRequest } from '@/lib/auth'
import { logActivity } from '@/lib/activityLogger'

export const runtime = 'nodejs'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission(request, 'add_feed')
    if (auth.response) return auth.response

    const { id } = await params
    const body = await request.json()
    const userId = getUserIdFromRequest(request)

    const updateData: any = {}
    if (body.feedTypeId) updateData.feedTypeId = body.feedTypeId
    if (body.penId !== undefined) updateData.penId = body.penId || null
    if (body.dailyAmount !== undefined || body.quantity !== undefined) updateData.quantity = Number(body.dailyAmount ?? body.quantity ?? 0)
    if (body.feedingTimes !== undefined || body.frequency !== undefined) updateData.frequency = Number(body.feedingTimes ?? body.frequency ?? 2)
    if (body.startDate) updateData.startDate = new Date(body.startDate)
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null
    if (body.isActive !== undefined) updateData.isActive = body.isActive
    if (body.notes !== undefined) updateData.notes = body.notes || null

    const schedule = await prisma.feedingSchedule.update({
      where: { id },
      data: updateData,
      include: { feedType: true, pen: true }
    })

    await logActivity({
      userId: userId || undefined,
      action: 'UPDATE',
      entity: 'FeedingSchedule',
      entityId: id,
      description: `تعديل جدول تغذية: ${schedule.feedType?.nameAr || ''} - ${schedule.pen?.nameAr || ''}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json(schedule)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في تعديل الجدول' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission(request, 'add_feed')
    if (auth.response) return auth.response

    const { id } = await params
    const userId = getUserIdFromRequest(request)

    const schedule = await prisma.feedingSchedule.delete({
      where: { id },
      include: { feedType: true, pen: true }
    })

    await logActivity({
      userId: userId || undefined,
      action: 'DELETE',
      entity: 'FeedingSchedule',
      entityId: id,
      description: `حذف جدول تغذية: ${schedule.feedType?.nameAr || ''} - ${schedule.pen?.nameAr || ''}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json({ message: 'تم حذف الجدول بنجاح' })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في حذف الجدول' }, { status: 500 })
  }
}
