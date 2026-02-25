import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, getUserIdFromRequest } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'
import { logActivity } from '@/lib/activityLogger'

export const runtime = 'nodejs'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'manage_feeds')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const { id } = await params
    const body = await request.json()
    const userId = await getUserIdFromRequest(request)

    // HI-03: Input validation for PUT
    if (body.nameAr !== undefined && (!body.nameAr || body.nameAr.trim().length === 0)) {
      return NextResponse.json({ error: 'اسم العلف بالعربية مطلوب' }, { status: 400 })
    }

    // MD-12: Check existence before update
    const existing = await prisma.feedType.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'نوع العلف غير موجود' }, { status: 404 })
    }

    const categoryMap: Record<string, string> = {
      GRAIN: 'GRAINS',
      SUPPLEMENT: 'SUPPLEMENTS'
    }
    const normalizedCategory = body.category ? (categoryMap[body.category] || body.category) : undefined

    // MD-11: Fix falsy 0 values for protein/energy/reorderLevel
    const updateData: any = {
      name: body.nameEn || body.nameAr,
      nameAr: body.nameAr,
      category: normalizedCategory,
      protein: body.protein !== undefined && body.protein !== null && body.protein !== '' ? parseFloat(body.protein) : null,
      energy: body.energy !== undefined && body.energy !== null && body.energy !== '' ? parseFloat(body.energy) : null,
      unitPrice: body.unitPrice !== undefined && body.unitPrice !== null && body.unitPrice !== '' ? parseFloat(body.unitPrice) : null,
      reorderLevel: body.reorderLevel !== undefined && body.reorderLevel !== null && body.reorderLevel !== '' ? parseFloat(body.reorderLevel) : undefined,
      supplier: body.supplier || null,
      notes: body.description || body.notes || null
    }

    const feedType = await prisma.feedType.update({
      where: { id },
      data: updateData
    })

    await logActivity({
      userId: userId || undefined,
      action: 'UPDATE',
      entity: 'FeedType',
      entityId: feedType.id,
      description: `تحديث نوع العلف: ${feedType.nameAr}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json(feedType)
  
    })
} catch (error) {
    console.error('Error updating feed type:', error)
    return NextResponse.json({ error: 'فشل في تحديث نوع العلف' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'manage_feeds')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const { id } = await params
    const userId = await getUserIdFromRequest(request)

    // Get feed type info before deleting
    const feedType = await prisma.feedType.findUnique({
      where: { id }
    })

    if (!feedType) {
      return NextResponse.json({ error: 'نوع العلف غير موجود' }, { status: 404 })
    }

    // HI-04: Check stocks, schedules AND feeding records before deleting
    const [stockCount, scheduleCount, feedingRecordCount] = await Promise.all([
      prisma.feedStock.count({ where: { feedTypeId: id } }),
      prisma.feedingSchedule.count({ where: { feedTypeId: id } }),
      prisma.feedingRecord.count({ where: { feedTypeId: id } })
    ])

    if (stockCount > 0 || scheduleCount > 0 || feedingRecordCount > 0) {
      const parts = []
      if (stockCount > 0) parts.push(`${stockCount} مخزون`)
      if (scheduleCount > 0) parts.push(`${scheduleCount} جدول تغذية`)
      if (feedingRecordCount > 0) parts.push(`${feedingRecordCount} سجل تغذية`)
      return NextResponse.json(
        { error: `لا يمكن حذف نوع العلف. يوجد ${parts.join(' و ')} مرتبط به.` },
        { status: 400 }
      )
    }

    await prisma.feedType.delete({
      where: { id }
    })

    await logActivity({
      userId: userId || undefined,
      action: 'DELETE',
      entity: 'FeedType',
      entityId: feedType.id,
      description: `حذف نوع العلف: ${feedType.nameAr}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json({ message: 'تم حذف نوع العلف بنجاح' })
  
    })
} catch (error) {
    console.error('Error deleting feed type:', error)
    return NextResponse.json({ error: 'فشل في حذف نوع العلف' }, { status: 500 })
  }
}
