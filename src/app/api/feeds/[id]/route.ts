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

    const categoryMap: Record<string, string> = {
      GRAIN: 'GRAINS',
      SUPPLEMENT: 'SUPPLEMENTS'
    }
    const normalizedCategory = categoryMap[body.category] || body.category

    // Convert field names from frontend to database schema
    const updateData: any = {
      name: body.nameEn || body.nameAr, // Use nameEn as name field
      nameAr: body.nameAr,
      category: normalizedCategory,
      protein: body.protein ? parseFloat(body.protein) : null,
      energy: body.energy ? parseFloat(body.energy) : null,
      unitPrice: body.unitPrice ? parseFloat(body.unitPrice) : null,
      reorderLevel: body.reorderLevel !== undefined ? parseFloat(body.reorderLevel) : undefined,
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

    // Check if there are stocks or schedules using this feed type
    const stockCount = await prisma.feedStock.count({
      where: { feedTypeId: id }
    })

    const scheduleCount = await prisma.feedingSchedule.count({
      where: { feedTypeId: id }
    })

    if (stockCount > 0 || scheduleCount > 0) {
      return NextResponse.json(
        { error: `لا يمكن حذف نوع العلف. يوجد ${stockCount} مخزون و ${scheduleCount} جدول تغذية مرتبط به.` },
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
    return NextResponse.json({ error: 'فشل في حذف نوع العلف' }, { status: 500 })
  }
}
