import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'

// GET /api/admin/stats — System-wide statistics (SUPER_ADMIN only)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response

    if (auth.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    const [
      totalTenants,
      activeTenants,
      totalFarms,
      totalUsers,
      totalGoats,
      totalSales,
      totalHealthRecords,
      totalBreedings,
      planBreakdown,
      recentTenants,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { isActive: true } }),
      prisma.farm.count(),
      prisma.user.count(),
      prisma.goat.count(),
      prisma.sale.count(),
      prisma.healthRecord.count(),
      prisma.breeding.count(),
      prisma.tenant.groupBy({
        by: ['plan'],
        _count: { id: true },
      }),
      prisma.tenant.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          plan: true,
          isActive: true,
          createdAt: true,
          _count: { select: { users: true, farms: true } },
        },
      }),
    ])

    return NextResponse.json({
      totals: {
        tenants: totalTenants,
        activeTenants,
        farms: totalFarms,
        users: totalUsers,
        goats: totalGoats,
        sales: totalSales,
        healthRecords: totalHealthRecords,
        breedings: totalBreedings,
      },
      planBreakdown: planBreakdown.map((p) => ({
        plan: p.plan,
        count: p._count.id,
      })),
      recentTenants,
      pendingSubscriptions: await prisma.subscription.findMany({
        where: { status: 'PENDING' },
        include: { tenant: { select: { id: true, name: true, nameAr: true, email: true, plan: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'فشل في جلب الإحصائيات' }, { status: 500 })
  }
}
