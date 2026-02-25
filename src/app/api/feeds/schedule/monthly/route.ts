import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, getUserIdFromRequest } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'
import { logActivity } from '@/lib/activityLogger'

export const runtime = 'nodejs'

const SMART_FEED_GUIDE = [
  { minMonths: 0, maxMonths: 3, kgPerHeadPerDay: 0.35 },
  { minMonths: 3, maxMonths: 6, kgPerHeadPerDay: 0.55 },
  { minMonths: 6, maxMonths: 12, kgPerHeadPerDay: 0.85 },
  { minMonths: 12, maxMonths: 24, kgPerHeadPerDay: 1.2 },
  { minMonths: 24, maxMonths: 999, kgPerHeadPerDay: 1.6 }
]

function getAgeInMonths(birthDate?: Date | null) {
  if (!birthDate) return 0
  const now = new Date()
  const birth = new Date(birthDate)
  const diffMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  return Math.max(0, diffMonths)
}

function getSmartPerHeadForGoats(goats: Array<{ birthDate: Date | null }>) {
  if (!goats.length) return 0

  const totalDaily = SMART_FEED_GUIDE.reduce((sum, group) => {
    const count = goats.filter(goat => {
      const ageMonths = getAgeInMonths(goat.birthDate)
      return ageMonths >= group.minMonths && ageMonths < group.maxMonths
    }).length

    return sum + (count * group.kgPerHeadPerDay)
  }, 0)

  return totalDaily / goats.length
}

function pickFeedTypeIdByCategory(feedTypes: Array<{ id: string; category: string }>, categories: string[], used: Set<string>) {
  for (const category of categories) {
    const match = feedTypes.find(type => type.category === category && !used.has(type.id))
    if (match) {
      used.add(match.id)
      return match.id
    }
  }

  const fallback = feedTypes.find(type => !used.has(type.id))
  if (fallback) {
    used.add(fallback.id)
    return fallback.id
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'add_feed')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const userId = await getUserIdFromRequest(request)
    const body = await request.json().catch(() => ({}))
    const replaceExisting = body?.replaceExisting !== false

    const [pens, feedTypes] = await Promise.all([
      prisma.pen.findMany({
        include: {
          goats: {
            where: { status: 'ACTIVE' },
            select: { id: true, birthDate: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.feedType.findMany({
        orderBy: { createdAt: 'asc' },
        select: { id: true, category: true, nameAr: true }
      })
    ])

    if (!feedTypes.length) {
      return NextResponse.json({ error: 'لا توجد أنواع أعلاف متاحة لإنشاء الجداول.' }, { status: 400 })
    }

    let createdSchedules = 0
    let processedPens = 0
    let deletedCount = 0

    // HI-08: Wrap everything in a transaction to prevent data loss
    await prisma.$transaction(async (tx) => {
      if (replaceExisting) {
        const deleted = await tx.feedingSchedule.deleteMany({})
        deletedCount = deleted.count
      }

      for (const pen of pens) {
        const headsCount = pen.goats.length
        if (headsCount === 0) continue

        const smartPerHead = getSmartPerHeadForGoats(pen.goats)
        if (smartPerHead <= 0) continue

        processedPens += 1

        const usedFeedTypeIds = new Set<string>()
        const hayFeedTypeId = pickFeedTypeIdByCategory(feedTypes, ['HAY'], usedFeedTypeIds)
        const energyFeedTypeId = pickFeedTypeIdByCategory(feedTypes, ['CONCENTRATE', 'GRAINS'], usedFeedTypeIds)
        const supplementFeedTypeId = pickFeedTypeIdByCategory(feedTypes, ['SUPPLEMENTS', 'MINERALS', 'OTHER'], usedFeedTypeIds)

        const schedulesToCreate = [
          hayFeedTypeId ? { feedTypeId: hayFeedTypeId, share: 0.6, frequency: 2 } : null,
          energyFeedTypeId ? { feedTypeId: energyFeedTypeId, share: 0.3, frequency: 2 } : null,
          supplementFeedTypeId ? { feedTypeId: supplementFeedTypeId, share: 0.1, frequency: 1 } : null
        ].filter(Boolean) as Array<{ feedTypeId: string; share: number; frequency: number }>

        if (!schedulesToCreate.length) continue

        const now = new Date()
        // LO-07: Use end of month instead of fixed +30 days
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

        for (const schedulePlan of schedulesToCreate) {
          const quantity = Number((smartPerHead * schedulePlan.share).toFixed(3))

          await tx.feedingSchedule.create({
            data: {
              penId: pen.id,
              feedTypeId: schedulePlan.feedTypeId,
              quantity,
              frequency: schedulePlan.frequency,
              startDate: now,
              endDate,
              isActive: true,
              notes: `جدول شهري ذكي تلقائي (${headsCount} رأس)`
            }
          })

          createdSchedules += 1
        }
      }
    })

    await logActivity({
      userId: userId || undefined,
      action: 'CREATE',
      entity: 'FeedingSchedule',
      entityId: 'monthly-smart-generator',
      description: `إنشاء جداول تغذية شهرية ذكية: ${createdSchedules} جدول لـ ${processedPens} حظيرة (محذوف: ${deletedCount})`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json({
      message: 'تم إنشاء الجداول الشهرية الذكية بنجاح',
      createdSchedules,
      processedPens,
      deletedCount
    })
  
    })
} catch (error) {
    console.error('Error creating monthly schedules:', error)
    return NextResponse.json({ error: 'فشل في إنشاء الجداول الشهرية الذكية' }, { status: 500 })
  }
}
