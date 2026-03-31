import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, getUserIdFromRequest } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'
import { logActivity } from '@/lib/activityLogger'
import { Prisma } from '@prisma/client'

export const runtime = 'nodejs'

const VALID_MOVEMENT_TYPES = ['PURCHASE', 'FEED_USAGE', 'USAGE', 'ADJUSTMENT', 'EXPIRED', 'RETURN']
const OUT_TYPES = ['FEED_USAGE', 'USAGE', 'EXPIRED']
const IN_TYPES  = ['PURCHASE', 'RETURN']

/**
 * GET /api/stock/movements?itemId=xxx&limit=50
 * Returns movement history for a specific item or all items.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_inventory')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {
      const searchParams = request.nextUrl.searchParams
      const itemId = searchParams.get('itemId')
      const type = searchParams.get('type')
      const limit = Math.min(parseInt(searchParams.get('limit') || '50') || 50, 200)

      const where: any = {}
      if (itemId) where.itemId = itemId
      if (type && VALID_MOVEMENT_TYPES.includes(type)) where.type = type

      const movements = await prisma.stockMovement.findMany({
        where,
        include: {
          item: { select: { nameAr: true, unit: true, type: true } },
          pen: { select: { nameAr: true } },
        },
        orderBy: { date: 'desc' },
        take: limit,
      })

      return NextResponse.json(movements)
    })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب حركات المخزون' }, { status: 500 })
  }
}

/**
 * POST /api/stock/movements
 * Creates a StockMovement and atomically updates StockItem.currentStock.
 * PURCHASE / RETURN → always positive (stock IN)
 * FEED_USAGE / USAGE / EXPIRED → always negative (stock OUT)
 * ADJUSTMENT → sign preserved as-is (can be + or -)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'add_inventory')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {
      const body = await request.json()
      const userId = await getUserIdFromRequest(request)

      if (!body.itemId) {
        return NextResponse.json({ error: 'itemId مطلوب' }, { status: 400 })
      }
      if (!body.type || !VALID_MOVEMENT_TYPES.includes(body.type)) {
        return NextResponse.json({ error: 'نوع الحركة غير صالح' }, { status: 400 })
      }
      const rawQty = parseFloat(body.qty)
      if (isNaN(rawQty) || rawQty === 0) {
        return NextResponse.json({ error: 'الكمية يجب أن تكون غير صفرية' }, { status: 400 })
      }

      // Enforce sign convention based on movement type
      let qty: number
      if (OUT_TYPES.includes(body.type)) {
        qty = -Math.abs(rawQty)
      } else if (IN_TYPES.includes(body.type)) {
        qty = Math.abs(rawQty)
      } else {
        // ADJUSTMENT: preserve the sign as provided by user
        qty = rawQty
      }

      // All inside a Serializable transaction to prevent TOCTOU race condition
      const result = await prisma.$transaction(async (tx) => {
        const item = await tx.stockItem.findUnique({ where: { id: body.itemId } })
        if (!item) return { error: 'المادة غير موجودة', status: 404 }

        if (qty < 0 && item.currentStock + qty < 0) {
          return {
            error: `الكمية المتاحة غير كافية. المتاح: ${item.currentStock}`,
            status: 422
          }
        }

        const movement = await tx.stockMovement.create({
          data: {
            itemId: body.itemId,
            type: body.type,
            qty,
            unitCost: body.unitCost !== undefined && body.unitCost !== '' ? parseFloat(body.unitCost) : null,
            date: body.date ? new Date(body.date) : new Date(),
            expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
            penId: body.penId || null,
            reference: body.reference || null,
            notes: body.notes || null,
            createdBy: userId || null,
          }
        })

        await tx.stockItem.update({
          where: { id: body.itemId },
          data: { currentStock: { increment: qty } }
        })

        return { movement, item }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

      if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: result.status })
      }

      await logActivity({
        userId: userId || undefined,
        action: 'CREATE',
        entity: 'StockMovement',
        entityId: result.movement.id,
        description: `حركة مخزون (${body.type}): ${qty > 0 ? '+' : ''}${qty} ${result.item.unit} من ${result.item.nameAr}`,
        ipAddress: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent')
      })

      return NextResponse.json(result.movement, { status: 201 })
    })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في تسجيل حركة المخزون' }, { status: 500 })
  }
}
