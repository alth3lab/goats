import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'

/**
 * Statistics endpoint - إحصائيات النظام
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_reports')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const [
      totalGoats,
      activeGoats,
      soldGoats,
      deceasedGoats,
      quarantineGoats,
      maleGoats,
      femaleGoats,
      totalBreeding,
      activeBreeding,
      deliveredBreeding,
      totalBirths,
      thisMonthBirths,
      totalHealthRecords,
      thisMonthHealthRecords,
      totalSales,
      thisMonthSales,
      pendingPayments,
      totalFeedingRecords,
      thisWeekFeeding,
      totalPens,
      avgPenCapacity
    ] = await Promise.all([
      prisma.goat.count(),
      prisma.goat.count({ where: { status: 'ACTIVE' } }),
      prisma.goat.count({ where: { status: 'SOLD' } }),
      prisma.goat.count({ where: { status: 'DECEASED' } }),
      prisma.goat.count({ where: { status: 'QUARANTINE' } }),
      prisma.goat.count({ where: { gender: 'MALE' } }),
      prisma.goat.count({ where: { gender: 'FEMALE' } }),
      prisma.breeding.count(),
      prisma.breeding.count({ where: { pregnancyStatus: { in: ['MATED', 'PREGNANT'] } } }),
      prisma.breeding.count({ where: { pregnancyStatus: 'DELIVERED' } }),
      prisma.birth.count(),
      prisma.birth.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      prisma.healthRecord.count(),
      prisma.healthRecord.count({
        where: {
          date: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      prisma.sale.count(),
      prisma.sale.count({
        where: {
          date: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      prisma.sale.count({ where: { paymentStatus: { in: ['PENDING', 'PARTIAL'] } } }),
      prisma.feedingRecord.count(),
      prisma.feedingRecord.count({
        where: {
          date: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.pen.count(),
      prisma.pen.aggregate({
        _avg: { capacity: true }
      })
    ])

    // حساب نسبة الإشغال للحظائر
    const pensWithCount = await prisma.pen.findMany({
      select: {
        capacity: true,
        _count: { select: { goats: true } }
      }
    })

    const totalCapacity = pensWithCount.reduce((sum, pen) => sum + (pen.capacity || 0), 0)
    const totalOccupied = pensWithCount.reduce((sum, pen) => sum + pen._count.goats, 0)
    const occupancyRate = totalCapacity > 0 ? (totalOccupied / totalCapacity) * 100 : 0

    // الماعز حسب السلالة
    const goatsByBreed = await prisma.goat.groupBy({
      by: ['breedId'],
      _count: { breedId: true },
      orderBy: { _count: { breedId: 'desc' } },
      take: 5
    })

    const breedDetails = await prisma.breed.findMany({
      where: { id: { in: goatsByBreed.map(g => g.breedId) } },
      select: { id: true, nameAr: true }
    })

    const topBreeds = goatsByBreed.map(item => ({
      breed: breedDetails.find(b => b.id === item.breedId)?.nameAr || 'غير محدد',
      count: item._count.breedId
    }))

    return NextResponse.json({
      goats: {
        total: totalGoats,
        active: activeGoats,
        sold: soldGoats,
        deceased: deceasedGoats,
        quarantine: quarantineGoats,
        male: maleGoats,
        female: femaleGoats,
        byBreed: topBreeds
      },
      breeding: {
        total: totalBreeding,
        active: activeBreeding,
        delivered: deliveredBreeding
      },
      births: {
        total: totalBirths,
        thisMonth: thisMonthBirths
      },
      health: {
        total: totalHealthRecords,
        thisMonth: thisMonthHealthRecords
      },
      sales: {
        total: totalSales,
        thisMonth: thisMonthSales,
        pendingPayments
      },
      feeding: {
        total: totalFeedingRecords,
        thisWeek: thisWeekFeeding
      },
      pens: {
        total: totalPens,
        avgCapacity: Math.round(avgPenCapacity._avg.capacity || 0),
        totalCapacity,
        totalOccupied,
        occupancyRate: Math.round(occupancyRate * 10) / 10
      }
    })
  
    })
} catch (error) {
    console.error('Error fetching statistics:', error)
    return NextResponse.json({ error: 'فشل في جلب الإحصائيات' }, { status: 500 })
  }
}
