import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'

/**
 * GET /api/stock/reorder
 * Returns all active StockItems where currentStock <= minStock (i.e. need reordering).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_inventory')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {
      const searchParams = request.nextUrl.searchParams
      const type = searchParams.get('type')

      const where: any = {
        isActive: true,
        minStock: { not: null }
      }
      if (type) where.type = type

      const items = await prisma.stockItem.findMany({
        where,
        orderBy: { currentStock: 'asc' }
      })

      // Filter where currentStock is at or below minStock
      const reorderItems = items.filter(
        i => i.minStock !== null && i.currentStock <= i.minStock
      )

      return NextResponse.json(reorderItems)
    })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب قائمة إعادة الطلب' }, { status: 500 })
  }
}
