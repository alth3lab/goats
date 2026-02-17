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
    const auth = await requirePermission(request, 'add_feed')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const { id } = await params
    const body = await request.json()
    const userId = await getUserIdFromRequest(request)

    // Convert field names from frontend to database schema
    const updateData: any = {
      feedTypeId: body.feedTypeId,
      quantity: parseFloat(body.quantity),
      unit: body.unit,
      cost: body.unitPrice ? parseFloat(body.unitPrice) : null,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : new Date(),
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      supplier: body.supplier || null,
      notes: body.notes || null
    }

    const stock = await prisma.feedStock.update({
      where: { id },
      data: updateData,
      include: { feedType: true }
    })

    await logActivity({
      userId: userId || undefined,
      action: 'UPDATE',
      entity: 'FeedStock',
      entityId: stock.id,
      description: `تحديث مخزون ${stock.feedType.nameAr}: ${stock.quantity} ${stock.unit}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json(stock)
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في تحديث المخزون' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'add_feed')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const { id } = await params
    const userId = await getUserIdFromRequest(request)

    // Get stock info before deleting
    const stock = await prisma.feedStock.findUnique({
      where: { id },
      include: { feedType: true }
    })

    if (!stock) {
      return NextResponse.json({ error: 'المخزون غير موجود' }, { status: 404 })
    }

    await prisma.feedStock.delete({
      where: { id }
    })

    await logActivity({
      userId: userId || undefined,
      action: 'DELETE',
      entity: 'FeedStock',
      entityId: stock.id,
      description: `حذف مخزون ${stock.feedType.nameAr}: ${stock.quantity} ${stock.unit}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json({ message: 'تم حذف المخزون بنجاح' })
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في حذف المخزون' }, { status: 500 })
  }
}
