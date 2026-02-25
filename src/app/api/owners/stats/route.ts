import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_goats')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const owners = await prisma.owner.findMany({
      where: { isActive: true },
      select: { id: true, name: true, phone: true }
    })

    const ownerStats = await Promise.all(
      owners.map(async (owner) => {
        const [
          activeGoats,
          totalGoats,
          soldGoats,
          deceasedGoats,
          totalExpenses,
          totalSales,
          maleCount,
          femaleCount
        ] = await Promise.all([
          prisma.goat.count({ where: { ownerId: owner.id, status: 'ACTIVE' } }),
          prisma.goat.count({ where: { ownerId: owner.id, status: { not: 'EXTERNAL' } } }),
          prisma.goat.count({ where: { ownerId: owner.id, status: 'SOLD' } }),
          prisma.goat.count({ where: { ownerId: owner.id, status: 'DECEASED' } }),
          prisma.expense.aggregate({ _sum: { amount: true }, where: { ownerId: owner.id } }),
          prisma.sale.aggregate({ _sum: { salePrice: true }, _count: true, where: { ownerId: owner.id } }),
          prisma.goat.count({ where: { ownerId: owner.id, status: 'ACTIVE', gender: 'MALE' } }),
          prisma.goat.count({ where: { ownerId: owner.id, status: 'ACTIVE', gender: 'FEMALE' } })
        ])

        const expenses = Number(totalExpenses._sum.amount || 0)
        const sales = Number(totalSales._sum.salePrice || 0)

        return {
          id: owner.id,
          name: owner.name,
          phone: owner.phone,
          activeGoats,
          totalGoats,
          soldGoats,
          deceasedGoats,
          maleCount,
          femaleCount,
          totalExpenses: expenses,
          totalSales: sales,
          salesCount: totalSales._count,
          netProfit: sales - expenses
        }
      })
    )

    // Unassigned animal stats
    const [unassignedActive, unassignedExpenses, unassignedSales] = await Promise.all([
      prisma.goat.count({ where: { ownerId: null, status: 'ACTIVE' } }),
      prisma.expense.aggregate({ _sum: { amount: true }, where: { ownerId: null } }),
      prisma.sale.aggregate({ _sum: { salePrice: true }, _count: true, where: { ownerId: null } })
    ])

    // Overall totals
    const totalActiveGoats = ownerStats.reduce((sum, o) => sum + o.activeGoats, 0) + unassignedActive
    const totalExpensesAll = ownerStats.reduce((sum, o) => sum + o.totalExpenses, 0) + Number(unassignedExpenses._sum.amount || 0)
    const totalSalesAll = ownerStats.reduce((sum, o) => sum + o.totalSales, 0) + Number(unassignedSales._sum.salePrice || 0)

    return NextResponse.json({
      owners: ownerStats,
      unassigned: {
        activeGoats: unassignedActive,
        totalExpenses: Number(unassignedExpenses._sum.amount || 0),
        totalSales: Number(unassignedSales._sum.salePrice || 0),
        salesCount: unassignedSales._count
      },
      summary: {
        totalOwners: owners.length,
        totalActiveGoats,
        totalExpenses: totalExpensesAll,
        totalSales: totalSalesAll,
        netProfit: totalSalesAll - totalExpensesAll
      }
    })
  
    })
  } catch (error) {
    console.error('GET /api/owners/stats failed:', error)
    return NextResponse.json({ error: 'فشل في جلب إحصائيات الملاك' }, { status: 500 })
  }
}
