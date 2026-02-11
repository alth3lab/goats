import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

export const runtime = 'nodejs'

// GET /api/sales/stats - الإحصائيات
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_sales')
    if (auth.response) return auth.response

    const [
      totalSales,
      pendingSales,
      partialSales,
      paidSales,
      salesData
    ] = await Promise.all([
      prisma.sale.count(),
      prisma.sale.count({ where: { paymentStatus: 'PENDING' } }),
      prisma.sale.count({ where: { paymentStatus: 'PARTIAL' } }),
      prisma.sale.count({ where: { paymentStatus: 'PAID' } }),
      prisma.sale.findMany({
        include: {
          payments: true
        }
      })
    ])

    // حساب الإحصائيات المالية
    let totalRevenue = 0
    let totalPaidAmount = 0
    let totalRemaining = 0

    salesData.forEach(sale => {
      totalRevenue += sale.salePrice
      const paid = sale.payments.reduce((sum, p) => sum + p.amount, 0)
      totalPaidAmount += paid
      totalRemaining += (sale.salePrice - paid)
    })

    return NextResponse.json({
      totalSales,
      pendingSales,
      partialSales,
      paidSales,
      totalRevenue,
      totalPaidAmount,
      totalRemaining
    })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب الإحصائيات' }, { status: 500 })
  }
}
