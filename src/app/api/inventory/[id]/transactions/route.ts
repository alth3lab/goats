import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, getUserIdFromRequest } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'
import { logActivity } from '@/lib/activityLogger'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'view_inventory')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const { id } = await params
    const transactions = await prisma.inventoryTransaction.findMany({
      where: { itemId: id },
      orderBy: { date: 'desc' }
    })

    return NextResponse.json(transactions)
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في جلب حركة المخزون' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'manage_inventory')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const { id } = await params
    const body = await request.json()
    const userId = await getUserIdFromRequest(request)

    const { type, quantity, unitPrice, reference, notes } = body

    // Create transaction
    const transaction = await prisma.inventoryTransaction.create({
      data: {
        itemId: id,
        type,
        quantity: Number(quantity),
        unitPrice: unitPrice ? Number(unitPrice) : null,
        totalCost: unitPrice ? Number(quantity) * Number(unitPrice) : null,
        reference,
        notes,
        createdBy: userId || undefined
      }
    })

    // Update item stock
    const item = await prisma.inventoryItem.findUnique({
      where: { id }
    })

    if (item) {
      let newStock = item.currentStock

      if (type === 'PURCHASE') {
        newStock += Number(quantity)
      } else if (type === 'USAGE' || type === 'EXPIRED') {
        newStock -= Number(quantity)
      } else if (type === 'ADJUSTMENT') {
        newStock = Number(quantity)
      }

      await prisma.inventoryItem.update({
        where: { id },
        data: { currentStock: Math.max(0, newStock) }
      })

      await logActivity({
        userId: userId || undefined,
        action: 'CREATE',
        entity: 'InventoryTransaction',
        entityId: transaction.id,
        description: `${type === 'PURCHASE' ? 'شراء' : type === 'USAGE' ? 'استخدام' : 'تعديل'} ${item.nameAr}: ${quantity} ${item.unit}`,
        ipAddress: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent')
      })
    }

    return NextResponse.json(transaction, { status: 201 })
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في تسجيل الحركة' }, { status: 500 })
  }
}
