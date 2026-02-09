import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const [
      totalGoats,
      activeGoats,
      maleGoats,
      femaleGoats,
      pregnantGoats,
      totalExpenses,
      totalSales,
      totalTypes,
      totalBreeds
    ] = await Promise.all([
      prisma.goat.count(),
      prisma.goat.count({ where: { status: 'ACTIVE' } }),
      prisma.goat.count({ where: { gender: 'MALE', status: 'ACTIVE' } }),
      prisma.goat.count({ where: { gender: 'FEMALE', status: 'ACTIVE' } }),
      prisma.breeding.count({ where: { pregnancyStatus: 'PREGNANT' } }),
      prisma.expense.aggregate({ _sum: { amount: true } }),
      prisma.sale.aggregate({ _sum: { salePrice: true } }),
      prisma.goatType.count(),
      prisma.breed.count()
    ])

    const stats = {
      totalGoats,
      activeGoats,
      maleGoats,
      femaleGoats,
      pregnantGoats,
      totalExpenses: totalExpenses._sum.amount || 0,
      totalSales: totalSales._sum.salePrice || 0,
      totalTypes,
      totalBreeds,
      netProfit: (totalSales._sum.salePrice || 0) - (totalExpenses._sum.amount || 0)
    }

    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب الإحصائيات' }, { status: 500 })
  }
}
