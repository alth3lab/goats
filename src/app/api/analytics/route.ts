import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

export const runtime = 'nodejs'

function toCsvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_reports')
    if (auth.response) return auth.response

    const searchParams = request.nextUrl.searchParams
    const year = Number(searchParams.get('year')) || new Date().getFullYear()
    const month = Number(searchParams.get('month')) || new Date().getMonth() + 1
    const format = searchParams.get('format')

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 1)

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

    const totalSales = sales._sum.salePrice || 0
    const totalExpenses = expenses._sum.amount || 0
    const netProfit = totalSales - totalExpenses
    const averageSale = salesCount > 0 ? totalSales / salesCount : 0
    const herdGrowth = birthsCount - deathsCount - salesCount
    const mortalityRate = activeGoats > 0 ? (deathsCount / activeGoats) * 100 : 0

    const payload = {
      period: { year, month },
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
        amount: item._sum.amount || 0
      }))
    }

    if (format === 'csv') {
      const rows = [
        ['year', String(year)],
        ['month', String(month)],
        ['totalSales', String(totalSales)],
        ['totalExpenses', String(totalExpenses)],
        ['netProfit', String(netProfit)],
        ['salesCount', String(salesCount)],
        ['averageSale', String(averageSale)],
        ['birthsCount', String(birthsCount)],
        ['deathsCount', String(deathsCount)],
        ['activeGoats', String(activeGoats)],
        ['herdGrowth', String(herdGrowth)],
        ['mortalityRate', String(mortalityRate)],
        ['expenseCategories', '']
      ]

      const expenseRows = payload.expensesByCategory.map((item) => [
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
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب التقرير' }, { status: 500 })
  }
}
