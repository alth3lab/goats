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

    // HI-02: Input validation for stock PUT
    if (body.quantity !== undefined) {
      const qty = parseFloat(body.quantity)
      if (isNaN(qty) || qty < 0) {
        return NextResponse.json({ error: 'الكمية لا يمكن أن تكون سالبة' }, { status: 400 })
      }
    }
    if (body.unitPrice !== undefined && body.unitPrice !== null && body.unitPrice !== '') {
      const price = parseFloat(body.unitPrice)
      if (isNaN(price) || price < 0) {
        return NextResponse.json({ error: 'السعر لا يمكن أن يكون سالباً' }, { status: 400 })
      }
    }
    if (body.expiryDate && body.purchaseDate && new Date(body.expiryDate) < new Date(body.purchaseDate)) {
      return NextResponse.json({ error: 'تاريخ الانتهاء لا يمكن أن يكون قبل تاريخ الشراء' }, { status: 400 })
    }

    // MD-12: Check existence before update
    const existing = await prisma.feedStock.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'المخزون غير موجود' }, { status: 404 })
    }

    // Convert field names from frontend to database schema
    const updateData: any = {
      feedTypeId: body.feedTypeId,
      quantity: parseFloat(body.quantity),
      unit: body.unit,
      cost: body.unitPrice !== undefined && body.unitPrice !== null && body.unitPrice !== '' ? parseFloat(body.unitPrice) : null,
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
    console.error('Error updating stock:', error)
    return NextResponse.json({ error: 'فشل في تحديث المخزون' }, { status: 500 })
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

    // MD-06: Delete associated expense (auto-created on stock purchase)
    try {
      const descPattern = `شراء علف: ${stock.feedType.nameAr} — ${stock.quantity} ${stock.unit}`
      await prisma.expense.deleteMany({
        where: {
          category: 'FEED',
          description: descPattern,
          date: stock.purchaseDate
        }
      })
    } catch {
      // Non-critical — don't fail deletion if expense cleanup fails
      console.warn('Could not clean up associated expense for stock:', id)
    }

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
    console.error('Error deleting stock:', error)
    return NextResponse.json({ error: 'فشل في حذف المخزون' }, { status: 500 })
  }
}
