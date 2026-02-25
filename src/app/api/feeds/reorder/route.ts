import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'

/* ── GET: Smart reorder suggestions ──
 * For each feed type, calculates:
 *   - currentStock: total quantity available
 *   - dailyConsumption: from active schedules
 *   - daysRemaining: stock / daily consumption
 *   - reorderLevel: threshold set on feed type
 *   - suggestedPurchase: quantity to buy based on consumption rate (30-day supply)
 *   - urgency: 'critical' | 'warning' | 'ok'
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_feeds')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

      // Get all feed types with stock and active schedules
      const feedTypes = await prisma.feedType.findMany({
        include: {
          stock: { where: { quantity: { gt: 0 } } },
          schedules: {
            where: { isActive: true },
            include: { pen: { select: { _count: { select: { goats: true } } } } }
          }
        }
      })

      // Calculate avg cost from last 90 days of consumption for better price estimates
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      const recentConsumptions = await prisma.dailyFeedConsumption.groupBy({
        by: ['feedTypeId'],
        where: { date: { gte: ninetyDaysAgo } },
        _sum: { quantity: true, cost: true },
        _count: true
      })

      const historicalByType: Record<string, { totalQty: number; totalCost: number; days: number }> = {}
      for (const c of recentConsumptions) {
        historicalByType[c.feedTypeId] = {
          totalQty: c._sum.quantity || 0,
          totalCost: c._sum.cost || 0,
          days: c._count
        }
      }

      const suggestions = feedTypes.map(ft => {
        const currentStock = ft.stock.reduce((s, st) => s + st.quantity, 0)
        const reorderLevel = ft.reorderLevel || 50

        // Daily consumption from active schedules (pen heads × quantity/head/day)
        const scheduledDaily = ft.schedules.reduce((s, sc) => {
          const heads = sc.pen?._count?.goats || 0
          return s + (sc.quantity * heads)
        }, 0)

        // Historical daily consumption (more accurate if available)
        const hist = historicalByType[ft.id]
        const historicalDaily = hist && hist.days > 0 ? hist.totalQty / hist.days : 0

        // Use the higher of scheduled vs historical for safety
        const dailyConsumption = Math.max(scheduledDaily, historicalDaily)

        const daysRemaining = dailyConsumption > 0 ? currentStock / dailyConsumption : currentStock > 0 ? 999 : 0

        // Suggest purchase for a 30-day supply minus current stock
        const targetDays = 30
        const targetQty = dailyConsumption * targetDays
        const suggestedPurchase = Math.max(0, Math.ceil(targetQty - currentStock))

        // Weighted average purchase price
        const totalStockValue = ft.stock.reduce((s, st) => s + st.quantity * (st.cost || 0), 0)
        const avgPrice = currentStock > 0 ? totalStockValue / currentStock : (hist ? hist.totalCost / Math.max(hist.totalQty, 1) : 0)
        const estimatedCost = suggestedPurchase * avgPrice

        // Urgency
        let urgency: 'critical' | 'warning' | 'ok' = 'ok'
        if (currentStock <= 0 && dailyConsumption > 0) urgency = 'critical'
        else if (currentStock < reorderLevel || daysRemaining <= 3) urgency = 'critical'
        else if (daysRemaining <= 7 || currentStock < reorderLevel * 1.5) urgency = 'warning'

        return {
          feedTypeId: ft.id,
          feedName: ft.nameAr,
          feedNameEn: ft.name,
          category: ft.category,
          currentStock: Math.round(currentStock * 100) / 100,
          reorderLevel,
          dailyConsumption: Math.round(dailyConsumption * 100) / 100,
          daysRemaining: Math.round(daysRemaining * 10) / 10,
          suggestedPurchase,
          avgPrice: Math.round(avgPrice * 100) / 100,
          estimatedCost: Math.round(estimatedCost),
          urgency
        }
      })

      // Sort: critical first, then warning, then ok
      const priorityMap = { critical: 0, warning: 1, ok: 2 }
      suggestions.sort((a, b) => priorityMap[a.urgency] - priorityMap[b.urgency] || a.daysRemaining - b.daysRemaining)

      // Summary
      const critical = suggestions.filter(s => s.urgency === 'critical')
      const warning = suggestions.filter(s => s.urgency === 'warning')
      const totalEstimatedCost = suggestions.reduce((s, i) => s + i.estimatedCost, 0)

      return NextResponse.json({
        suggestions,
        summary: {
          totalTypes: suggestions.length,
          criticalCount: critical.length,
          warningCount: warning.length,
          totalEstimatedCost
        }
      })
    })
  } catch (error) {
    console.error('Error generating reorder suggestions:', error)
    return NextResponse.json({ error: 'فشل في حساب اقتراحات الشراء' }, { status: 500 })
  }
}
