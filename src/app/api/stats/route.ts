import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { Prisma } from '@prisma/client'

export const runtime = 'nodejs'

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null
  return ((current - previous) / Math.abs(previous)) * 100
}

async function getMonthlyData(startDate?: Date, endDate?: Date) {
  const dateFilter = startDate && endDate ? { gte: startDate, lt: endDate } : undefined
  const dateWhere = dateFilter ? { date: dateFilter } : {}
  const createdAtWhere = dateFilter ? { createdAt: dateFilter } : {}
  const deceasedWhere = dateFilter
    ? { status: 'DECEASED' as const, updatedAt: dateFilter }
    : { status: 'DECEASED' as const }

  const [sales, expenses, salesCount, birthsCount, deathsCount, expensesByCategory] = await Promise.all([
    prisma.sale.aggregate({ _sum: { salePrice: true }, where: dateWhere }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: dateWhere }),
    prisma.sale.count({ where: dateWhere }),
    prisma.birth.count({ where: createdAtWhere }),
    prisma.goat.count({ where: deceasedWhere }),
    prisma.expense.groupBy({
      by: ['category'],
      _sum: { amount: true },
      where: dateWhere
    })
  ])
  return {
    totalSales: Number(sales._sum.salePrice || 0),
    totalExpenses: Number(expenses._sum.amount || 0),
    salesCount,
    birthsCount,
    deathsCount,
    expensesByCategory: expensesByCategory.map((item) => ({
      category: item.category,
      amount: Number(item._sum.amount || 0)
    }))
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response

    const yearParam = request.nextUrl.searchParams.get('year')
    const monthParam = request.nextUrl.searchParams.get('month')
    const hasFilter = yearParam && monthParam

    let curStart: Date | undefined
    let curEnd: Date | undefined
    let prevStart: Date | undefined
    let prevEnd: Date | undefined

    if (hasFilter) {
      const year = parseInt(yearParam)
      const month = parseInt(monthParam) - 1
      curStart = new Date(year, month, 1)
      curEnd = new Date(year, month + 1, 1)
      prevStart = new Date(year, month - 1, 1)
      prevEnd = new Date(year, month, 1)
    }

    const feedConsumptionPromise = (async () => {
      const periodFilter = curStart && curEnd
        ? Prisma.sql`WHERE \`date\` >= ${curStart} AND \`date\` < ${curEnd}`
        : Prisma.empty

      const rows = await prisma.$queryRaw<Array<{
        quantity: number | null
        cost: number | null
        records: bigint | number | null
      }>>(Prisma.sql`
        SELECT
          COALESCE(SUM(\`quantity\`), 0) AS quantity,
          COALESCE(SUM(\`cost\`), 0) AS cost,
          COUNT(*) AS records
        FROM \`DailyFeedConsumption\`
        ${periodFilter}
      `).catch(() => [])

      const row = rows[0]
      const records = Number(row?.records || 0)
      return {
        quantity: Number(row?.quantity || 0),
        cost: Number(row?.cost || 0),
        hasLogs: records > 0,
        source: 'daily' as const,
      }
    })()

    const [
      totalGoats,
      activeGoats,
      maleGoats,
      femaleGoats,
      pregnantGoats,
      totalExpensesAll,
      totalSalesAll,
      totalTypes,
      totalBreeds,
      currentMonth,
      previousMonth,
      activeBreedings,
      lowStockCount,
      feedConsumption
    ] = await Promise.all([
      prisma.goat.count(),
      prisma.goat.count({ where: { status: 'ACTIVE' } }),
      prisma.goat.count({ where: { gender: 'MALE', status: 'ACTIVE' } }),
      prisma.goat.count({ where: { gender: 'FEMALE', status: 'ACTIVE' } }),
      prisma.breeding.count({ where: { pregnancyStatus: 'PREGNANT' } }),
      prisma.expense.aggregate({ _sum: { amount: true } }),
      prisma.sale.aggregate({ _sum: { salePrice: true } }),
      prisma.goatType.count(),
      prisma.breed.count(),
      getMonthlyData(curStart, curEnd),
      hasFilter ? getMonthlyData(prevStart, prevEnd) : Promise.resolve(null),
      // Active breeding (MATED + PREGNANT)
      prisma.breeding.count({ where: { pregnancyStatus: { in: ['MATED', 'PREGNANT'] } } }),
      // Low stock items (currentStock <= minStock where minStock is set)
      prisma.inventoryItem.findMany({
        where: { minStock: { not: null } },
        select: { currentStock: true, minStock: true }
      }).then((items) => items.filter((item) => item.minStock !== null && item.currentStock <= item.minStock).length),
      // Feed consumption from DailyFeedConsumption
      feedConsumptionPromise
    ])

    const allSales = Number(totalSalesAll._sum.salePrice || 0)
    const allExpenses = Number(totalExpensesAll._sum.amount || 0)

    const curNetProfit = currentMonth.totalSales - currentMonth.totalExpenses
    const prevNetProfit = previousMonth ? previousMonth.totalSales - previousMonth.totalExpenses : 0
    const curHerdGrowth = currentMonth.birthsCount - currentMonth.deathsCount - currentMonth.salesCount
    const prevHerdGrowth = previousMonth
      ? previousMonth.birthsCount - previousMonth.deathsCount - previousMonth.salesCount
      : 0
    const mortalityRate = activeGoats > 0 ? (currentMonth.deathsCount / activeGoats) * 100 : 0

    // Yearly expenses & sales by month
    const currentYear = new Date().getFullYear()
    const yearStart = new Date(currentYear, 0, 1)
    const yearEnd = new Date(currentYear + 1, 0, 1)
    const [yearlyExpenses, yearlySales] = await Promise.all([
      prisma.expense.findMany({
        where: { date: { gte: yearStart, lt: yearEnd } },
        select: { date: true, amount: true }
      }),
      prisma.sale.findMany({
        where: { date: { gte: yearStart, lt: yearEnd } },
        select: { date: true, salePrice: true }
      })
    ])
    const expensesByMonth: Array<{ month: number; name: string; amount: number }> = []
    const salesByMonth: Array<{ month: number; name: string; amount: number }> = []
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
    for (let m = 0; m < 12; m++) {
      const expTotal = yearlyExpenses
        .filter(e => new Date(e.date).getMonth() === m)
        .reduce((s, e) => s + Number(e.amount), 0)
      expensesByMonth.push({ month: m + 1, name: monthNames[m], amount: expTotal })
      const salTotal = yearlySales
        .filter(e => new Date(e.date).getMonth() === m)
        .reduce((s, e) => s + Number(e.salePrice), 0)
      salesByMonth.push({ month: m + 1, name: monthNames[m], amount: salTotal })
    }

    const stats = {
      totalGoats,
      activeGoats,
      maleGoats,
      femaleGoats,
      pregnantGoats,
      totalExpenses: allExpenses,
      totalSales: allSales,
      totalTypes,
      totalBreeds,
      netProfit: allSales - allExpenses,
      filtered: !!hasFilter,
      currentYear,
      expensesByMonth,
      salesByMonth,
      activeBreedings,
      lowStockCount: typeof lowStockCount === 'number' ? lowStockCount : 0,
      feedConsumption: {
        quantity: Number(feedConsumption?.quantity || 0),
        cost: Number(feedConsumption?.cost || 0),
        hasLogs: Boolean(feedConsumption?.hasLogs),
        source: feedConsumption?.source || 'daily',
      },
      // Monthly KPIs
      monthly: {
        totalSales: currentMonth.totalSales,
        totalExpenses: currentMonth.totalExpenses,
        netProfit: curNetProfit,
        salesCount: currentMonth.salesCount,
        birthsCount: currentMonth.birthsCount,
        deathsCount: currentMonth.deathsCount,
        herdGrowth: curHerdGrowth,
        mortalityRate,
        expensesByCategory: currentMonth.expensesByCategory,
      },
      previous: previousMonth ? {
        totalSales: previousMonth.totalSales,
        totalExpenses: previousMonth.totalExpenses,
        netProfit: prevNetProfit,
      } : null,
      comparison: previousMonth ? {
        totalSales: pctChange(currentMonth.totalSales, previousMonth.totalSales),
        totalExpenses: pctChange(currentMonth.totalExpenses, previousMonth.totalExpenses),
        netProfit: pctChange(curNetProfit, prevNetProfit),
        salesCount: pctChange(currentMonth.salesCount, previousMonth.salesCount),
        birthsCount: pctChange(currentMonth.birthsCount, previousMonth.birthsCount),
        deathsCount: pctChange(currentMonth.deathsCount, previousMonth.deathsCount),
        herdGrowth: pctChange(curHerdGrowth, prevHerdGrowth),
      } : null
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('GET /api/stats failed:', error)
    const details = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'فشل في جلب الإحصائيات', details: process.env.NODE_ENV === 'development' ? details : undefined },
      { status: 500 }
    )
  }
}
