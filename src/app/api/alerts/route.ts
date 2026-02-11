import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/formatters'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response

    const today = new Date()
    const nextMonth = new Date()
    nextMonth.setDate(today.getDate() + 30)

    const prismaAny = prisma as any
    const settings = await prismaAny.appSetting.findFirst()
    const alertPenCapacityPercent = settings?.alertPenCapacityPercent ?? 90
    const alertDeathCount = settings?.alertDeathCount ?? 3
    const alertDeathWindowDays = settings?.alertDeathWindowDays ?? 30
    const alertBreedingOverdueDays = settings?.alertBreedingOverdueDays ?? 150

    const deathWindowStart = new Date()
    deathWindowStart.setDate(today.getDate() - alertDeathWindowDays)

    const [upcomingBirths, upcomingVaccinations, weaningKids, pens, deaths, overdueBreedings, lowStockItems, expiringFeeds] = await Promise.all([
      // 1. Upcoming Births (Due within 30 days)
      prisma.breeding.findMany({
        where: {
          pregnancyStatus: { in: ['PREGNANT', 'MATED'] },
          dueDate: {
            gte: today,
            lte: nextMonth
          },
          mother: { status: 'ACTIVE' }
        },
        include: {
          mother: {
            include: { breed: true }
          }
        },
        orderBy: { dueDate: 'asc' }
      }),

      // 2. Upcoming Vaccinations (Due within 30 days or Overdue)
      prisma.healthRecord.findMany({
        where: {
          nextDueDate: {
            lte: nextMonth,
            not: null
          },
          goat: { status: 'ACTIVE' }
        },
        include: {
          goat: { select: { tagId: true, name: true } }
        },
        orderBy: { nextDueDate: 'asc' }
      }),

      // 3. Weaning Alerts (Kids turning 3 months old soon)
      prisma.goat.findMany({
        where: {
          status: 'ACTIVE',
          birthDate: {
            // Born between 4 months ago and 2.5 months ago (approaching or just passed weaning)
            gte: new Date(new Date().setMonth(today.getMonth() - 4)),
            lte: new Date(new Date().setMonth(today.getMonth() - 2.5))
          }
        },
        select: {
          id: true,
          tagId: true,
          name: true,
          birthDate: true,
          motherTagId: true,
          breed: { select: { nameAr: true } }
        },
        orderBy: { birthDate: 'asc' }
      }),

      // 4. Pen capacity alerts
      prisma.pen.findMany({
        include: {
          goats: {
            where: { status: 'ACTIVE' },
            select: { id: true }
          }
        }
      }),

      // 5. Frequent deaths in a window
      prisma.goat.findMany({
        where: {
          status: 'DECEASED',
          updatedAt: { gte: deathWindowStart }
        },
        select: { id: true }
      }),

      // 6. Overdue breeding
      prisma.breeding.findMany({
        where: {
          pregnancyStatus: { in: ['MATED', 'PREGNANT'] },
          birthDate: null,
          matingDate: {
            lte: new Date(new Date().setDate(today.getDate() - alertBreedingOverdueDays))
          },
          mother: { status: 'ACTIVE' }
        },
        include: {
          mother: { select: { tagId: true, name: true } }
        },
        orderBy: { matingDate: 'asc' }
      }),

      // 7. Low Stock Items
      prismaAny.inventoryItem.findMany({
        where: {
          currentStock: { lte: prismaAny.raw('minStock') }
        },
        select: {
          id: true,
          nameAr: true,
          currentStock: true,
          minStock: true,
          unit: true
        }
      }).catch(() => []),

      // 8. Expiring Feeds
      prismaAny.feedStock.findMany({
        where: {
          expiryDate: {
            lte: nextMonth,
            not: null
          }
        },
        include: {
          feedType: { select: { nameAr: true } }
        },
        orderBy: { expiryDate: 'asc' }
      }).catch(() => [])
    ])

    const capacityAlerts = pens
      .filter((pen) => pen.capacity && pen.capacity > 0)
      .map((pen) => {
        const count = pen.goats.length
        const capacity = pen.capacity || 0
        const percent = capacity > 0 ? Math.round((count / capacity) * 100) : 0
        if (percent < alertPenCapacityPercent) return null

        return {
          id: `pen-${pen.id}`,
          type: 'PEN_CAPACITY',
          severity: count >= capacity ? 'error' : 'warning',
          title: 'سعة حظيرة مرتفعة',
          message: `${pen.nameAr} - ${count}/${capacity} (${percent}%)`,
          date: new Date()
        }
      })
      .filter((item): item is { id: string; type: string; severity: string; title: string; message: string; date: Date } => Boolean(item))

    const deathAlert = deaths.length >= alertDeathCount
      ? [{
          id: 'death-alert',
          type: 'DEATHS',
          severity: 'error',
          title: 'تنبيه نفوق متكرر',
          message: `تم تسجيل ${deaths.length} حالات نفوق خلال آخر ${alertDeathWindowDays} يوم`,
          date: new Date()
        }]
      : []

    const overdueAlerts = overdueBreedings.map((record) => {
      const overdueDays = Math.floor((today.getTime() - new Date(record.matingDate).getTime()) / (1000 * 60 * 60 * 24))
      return {
        id: `overdue-${record.id}`,
        type: 'BREEDING_OVERDUE',
        severity: overdueDays > alertBreedingOverdueDays + 30 ? 'error' : 'warning',
        title: 'تأخر ولادة/تكاثر',
        message: `الأم ${record.mother.tagId} - مر ${overdueDays} يوم منذ التزاوج`,
        date: record.matingDate
      }
    })

    const lowStockAlerts = lowStockItems.map((item: any) => ({
      id: `stock-${item.id}`,
      type: 'LOW_STOCK',
      severity: item.currentStock === 0 ? 'error' : 'warning',
      title: 'نقص مخزون',
      message: `${item.nameAr} - المخزون: ${item.currentStock} ${item.unit} (الحد الأدنى: ${item.minStock})`,
      date: new Date()
    }))

    const expiringFeedsAlerts = expiringFeeds.map((stock: any) => {
      const daysUntilExpiry = Math.ceil((new Date(stock.expiryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return {
        id: `feed-${stock.id}`,
        type: 'EXPIRING_FEED',
        severity: daysUntilExpiry <= 7 ? 'error' : 'warning',
        title: 'علف قرب الانتهاء',
        message: `${stock.feedType.nameAr} - ${stock.quantity} ${stock.unit} (${daysUntilExpiry <= 0 ? 'منتهي' : `${daysUntilExpiry} يوم متبقي`})`,
        date: stock.expiryDate
      }
    })

    const alerts = [
      // Format Birth Alerts
      ...upcomingBirths.map(record => ({
        id: `birth-${record.id}`,
        type: 'BIRTH',
        severity: getSeverity(new Date(record.dueDate!), today),
        title: 'ولادة متوقعة',
        message: `الأم ${record.mother.tagId} (${record.mother.breed.nameAr}) - متوقع: ${formatDate(record.dueDate!)}`,
        date: record.dueDate
      })),

      // Format Vaccination Alerts
      ...upcomingVaccinations.map(record => ({
        id: `health-${record.id}`,
        type: 'HEALTH',
        severity: getSeverity(new Date(record.nextDueDate!), today),
        title: 'تطعيم/علاج مستحق',
        message: `${record.type === 'VACCINATION' ? 'تطعيم' : 'علاج'} للماعز ${record.goat.tagId} - ${formatDate(record.nextDueDate!)}`,
        date: record.nextDueDate
      })),

      // Format Weaning Alerts
      ...weaningKids.map(kid => {
        const ageInDays = Math.floor((today.getTime() - new Date(kid.birthDate).getTime()) / (1000 * 60 * 60 * 24))
        return {
          id: `wean-${kid.id}`,
          type: 'WEANING',
          severity: 'info',
          title: 'فطام مقترح',
          message: `الماعز ${kid.tagId} (عمر ${Math.floor(ageInDays/30)} شهر) - جاهز للفطام`,
          date: new Date() // Actionable now
        }
      }),

      ...capacityAlerts,
      ...deathAlert,
      ...overdueAlerts,
      ...lowStockAlerts,
      ...expiringFeedsAlerts
    ].sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())

    return NextResponse.json(alerts)
  } catch (error) {
    console.error('Error fetching alerts:', error)
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }
}

function getSeverity(date: Date, today: Date) {
  const diffTime = date.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return 'error' // Overdue
  if (diffDays <= 3) return 'warning' // Due very soon
  return 'info' // Due later
}
