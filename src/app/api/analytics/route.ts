import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'

function toCsvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

async function fetchMonthData(startDate: Date, endDate: Date) {
  const [
    sales,
    expenses,
    salesCount,
    birthsCount,
    deathsCount,
    activeGoats,
    expensesByCategory
  ] = await Promise.all([
    prisma.sale.aggregate({
      _sum: { salePrice: true },
      where: { date: { gte: startDate, lt: endDate } }
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { date: { gte: startDate, lt: endDate } }
    }),
    prisma.sale.count({ where: { date: { gte: startDate, lt: endDate } } }),
    prisma.birth.count({ where: { createdAt: { gte: startDate, lt: endDate } } }),
    prisma.goat.count({ where: { status: 'DECEASED', updatedAt: { gte: startDate, lt: endDate } } }),
    prisma.goat.count({ where: { status: 'ACTIVE' } }),
    prisma.expense.groupBy({
      by: ['category'],
      _sum: { amount: true },
      where: { date: { gte: startDate, lt: endDate } }
    })
  ])

  const totalSales = Number(sales._sum.salePrice || 0)
  const totalExpenses = Number(expenses._sum.amount || 0)
  const netProfit = totalSales - totalExpenses
  const averageSale = salesCount > 0 ? totalSales / salesCount : 0
  const herdGrowth = birthsCount - deathsCount - salesCount
  const mortalityRate = activeGoats > 0 ? (deathsCount / activeGoats) * 100 : 0

  return {
    totalSales,
    totalExpenses,
    netProfit,
    salesCount,
    averageSale,
    birthsCount,
    deathsCount,
    activeGoats,
    herdGrowth,
    mortalityRate,
    expensesByCategory: expensesByCategory.map((item) => ({
      category: item.category,
      amount: Number(item._sum.amount || 0)
    }))
  }
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null
  return ((current - previous) / Math.abs(previous)) * 100
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_reports')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const searchParams = request.nextUrl.searchParams
    const year = Number(searchParams.get('year')) || new Date().getFullYear()
    const month = Number(searchParams.get('month')) || new Date().getMonth() + 1
    const format = searchParams.get('format')

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 1)

    // Previous month dates
    const prevStart = new Date(year, month - 2, 1)
    const prevEnd = new Date(year, month - 1, 1)

    const [current, previous] = await Promise.all([
      fetchMonthData(startDate, endDate),
      fetchMonthData(prevStart, prevEnd)
    ])

    // Feed cost per head
    const feedExpense = current.expensesByCategory.find(e => e.category === 'FEED')
    const feedCostPerHead = current.activeGoats > 0 && feedExpense
      ? feedExpense.amount / current.activeGoats : 0
    const prevFeedExpense = previous.expensesByCategory.find(e => e.category === 'FEED')
    const prevFeedCostPerHead = previous.activeGoats > 0 && prevFeedExpense
      ? prevFeedExpense.amount / previous.activeGoats : 0

    // Revenue per head
    const revenuePerHead = current.activeGoats > 0
      ? current.totalSales / current.activeGoats : 0
    const prevRevenuePerHead = previous.activeGoats > 0
      ? previous.totalSales / previous.activeGoats : 0

    const payload = {
      period: { year, month },
      ...current,
      feedCostPerHead,
      revenuePerHead,
      comparison: {
        totalSales: pctChange(current.totalSales, previous.totalSales),
        totalExpenses: pctChange(current.totalExpenses, previous.totalExpenses),
        netProfit: pctChange(current.netProfit, previous.netProfit),
        salesCount: pctChange(current.salesCount, previous.salesCount),
        birthsCount: pctChange(current.birthsCount, previous.birthsCount),
        deathsCount: pctChange(current.deathsCount, previous.deathsCount),
        herdGrowth: pctChange(current.herdGrowth, previous.herdGrowth),
        mortalityRate: pctChange(current.mortalityRate, previous.mortalityRate),
        feedCostPerHead: pctChange(feedCostPerHead, prevFeedCostPerHead),
        revenuePerHead: pctChange(revenuePerHead, prevRevenuePerHead),
      },
      previous: {
        totalSales: previous.totalSales,
        totalExpenses: previous.totalExpenses,
        netProfit: previous.netProfit,
      }
    }

    if (format === 'csv') {
      const rows = [
        ['year', String(year)],
        ['month', String(month)],
        ['totalSales', String(current.totalSales)],
        ['totalExpenses', String(current.totalExpenses)],
        ['netProfit', String(current.netProfit)],
        ['salesCount', String(current.salesCount)],
        ['averageSale', String(current.averageSale)],
        ['birthsCount', String(current.birthsCount)],
        ['deathsCount', String(current.deathsCount)],
        ['activeGoats', String(current.activeGoats)],
        ['herdGrowth', String(current.herdGrowth)],
        ['mortalityRate', String(current.mortalityRate)],
        ['feedCostPerHead', String(feedCostPerHead)],
        ['revenuePerHead', String(revenuePerHead)],
        ['expenseCategories', '']
      ]

      const expenseRows = current.expensesByCategory.map((item) => [
        `expense_${item.category}`,
        String(item.amount)
      ])

      const csv = [...rows, ...expenseRows]
        .map((row) => row.map(toCsvValue).join(','))
        .join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="monthly-kpi-${year}-${month}.csv"`
        }
      })
    }

    return NextResponse.json(payload)
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في جلب التقرير' }, { status: 500 })
  }
}
