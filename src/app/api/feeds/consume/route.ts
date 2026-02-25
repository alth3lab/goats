import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'
import { Prisma } from '@prisma/client'

export const runtime = 'nodejs'

type RequiredItem = { feedTypeName: string; required: number }

function dayStart(input: Date | string) {
  const d = new Date(input)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function dateKey(input: Date | string) {
  return dayStart(input).toISOString().slice(0, 10)
}

function dateRange(start: Date, end: Date) {
  const out: Date[] = []
  const cursor = dayStart(start)
  const last = dayStart(end)
  while (cursor <= last) {
    out.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

/* ── حساب المطلوب من الجداول المخزنة مسبقاً (بدون استعلام DB) ── */
function requiredForDateFromCache(
  targetDate: Date,
  allSchedules: Array<{
    feedTypeId: string
    feedType: { nameAr: string }
    quantity: number
    penId: string | null
    startDate: Date
    endDate: Date | null
    pen: { _count: { goats: number } } | null
  }>
): Map<string, { feedTypeName: string; required: number; byPen: Map<string, number> }> {
  const result = new Map<string, { feedTypeName: string; required: number; byPen: Map<string, number> }>()
  const t = dayStart(targetDate).getTime()

  for (const s of allSchedules) {
    if (dayStart(s.startDate).getTime() > t) continue
    if (s.endDate && dayStart(s.endDate).getTime() < t) continue

    const heads = s.pen?._count?.goats || 0
    const required = s.quantity * heads
    if (required <= 0) continue

    const penKey = s.penId || '__none__'

    const existing = result.get(s.feedTypeId)
    if (existing) {
      existing.required += required
      existing.byPen.set(penKey, (existing.byPen.get(penKey) || 0) + required)
    } else {
      const byPen = new Map<string, number>()
      byPen.set(penKey, required)
      result.set(s.feedTypeId, { feedTypeName: s.feedType.nameAr, required, byPen })
    }
  }
  return result
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'manage_feeds')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    // SEC-01: No fallback — only authenticated user
    const actorId = await getUserIdFromRequest(request)
    if (!actorId) {
      return NextResponse.json({ error: 'تعذر تحديد المستخدم المنفذ للعملية' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const isAuto = Boolean(body?.auto)
    const targetDate = dayStart(body?.date ? new Date(body.date) : new Date())

    /* ── تحديد الأيام المطلوب تنفيذها ── */
    let executionDates: Date[] = []
    if (isAuto) {
      const schedules = await prisma.feedingSchedule.findMany({
        where: { isActive: true },
        select: { startDate: true }
      })

      if (schedules.length === 0) {
        return NextResponse.json({
          success: true,
          auto: true,
          message: 'لا توجد جداول تغذية نشطة للتنفيذ التلقائي',
          executedDates: [],
          consumed: []
        })
      }

      const earliest = schedules.reduce((min, s) => {
        const start = dayStart(s.startDate)
        return start < min ? start : min
      }, dayStart(schedules[0].startDate))

      // PERF-03: Limit auto-consume to max 90 days back
      const maxLookback = dayStart(new Date())
      maxLookback.setDate(maxLookback.getDate() - 90)
      const effectiveStart = earliest > maxLookback ? earliest : maxLookback

      executionDates = dateRange(effectiveStart, targetDate)
    } else {
      executionDates = [targetDate]
    }

    /* ── استبعاد الأيام المنفذة مسبقاً بشكل فعّال ── */
    const allDateKeys = executionDates.map((d) => dateKey(d))
    const existingMarkers = await prisma.activityLog.findMany({
      where: {
        action: 'CREATE',
        entity: 'FeedConsumption',
        entityId: { in: allDateKeys }
      },
      select: { entityId: true }
    })

    const existingSet = new Set(existingMarkers.map((m) => m.entityId).filter(Boolean) as string[])
    const pendingDates = executionDates.filter((d) => !existingSet.has(dateKey(d)))

    if (pendingDates.length === 0) {
      return NextResponse.json({
        success: true,
        auto: isAuto,
        date: dateKey(targetDate),
        message: isAuto ? 'لا توجد أيام جديدة لتنفيذ الصرف' : `تم تنفيذ صرف الأعلاف مسبقاً لتاريخ ${dateKey(targetDate)}`,
        executedDates: [],
        consumed: []
      })
    }

    /* ── تحميل الجداول مرة واحدة فقط ── */
    const allSchedules = await prisma.feedingSchedule.findMany({
      where: { isActive: true },
      include: {
        feedType: { select: { nameAr: true } },
        pen: { include: { _count: { select: { goats: true } } } }
      }
    })

    const ipAddress = request.headers.get('x-forwarded-for') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    const consumedByType = new Map<string, { feedTypeName: string; consumedKg: number }>()
    const executedDates: string[] = []
    const skippedDates: Array<{ date: string; shortages: Array<{ feedTypeId: string; feedTypeName: string; required: number; available: number }> }> = []

    for (const pendingDate of pendingDates) {
      const key = dateKey(pendingDate)
      const requiredByFeedType = requiredForDateFromCache(pendingDate, allSchedules)

      if (requiredByFeedType.size === 0) {
        try {
          // CR-01: Use Serializable transaction to prevent race condition
          await prisma.$transaction(async (tx) => {
            // Double-check inside transaction
            const existing = await tx.activityLog.findFirst({
              where: { action: 'CREATE', entity: 'FeedConsumption', entityId: key }
            })
            if (existing) return // Already executed by another request

            await tx.activityLog.create({
              data: {
                userId: actorId,
                action: 'CREATE',
                entity: 'FeedConsumption',
                entityId: key,
                description: `تنفيذ صرف أعلاف يومي (${key}) - لا يوجد صرف فعلي`,
                ipAddress,
                userAgent
              }
            })
          }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
        } catch {
          // Race condition caught — another request executed it
          continue
        }
        executedDates.push(key)
        continue
      }

      /* CR-01: Execute EVERYTHING inside a Serializable transaction */
      try {
        const result = await prisma.$transaction(async (tx) => {
          // Double-check marker inside transaction
          const existing = await tx.activityLog.findFirst({
            where: { action: 'CREATE', entity: 'FeedConsumption', entityId: key }
          })
          if (existing) return { skipped: true as const }

          // Read stocks INSIDE transaction for consistency (CR-01)
          const currentStocks = await tx.feedStock.findMany({
            where: { quantity: { gt: 0 } },
            orderBy: [{ purchaseDate: 'asc' }, { createdAt: 'asc' }]
          })

          /* فحص الكفاية + بناء خطة الخصم */
          const shortages: Array<{ feedTypeId: string; feedTypeName: string; required: number; available: number }> = []
          const plans: Array<{
            feedTypeId: string;
            feedTypeName: string;
            required: number;
            totalCost: number;
            byPen: Map<string, number>;
            updates: Array<{ stockId: string; nextQty: number; used: number; cost: number }>
          }> = []

          for (const [feedTypeId, req] of requiredByFeedType.entries()) {
            const typeStocks = currentStocks.filter((s) => s.feedTypeId === feedTypeId && s.quantity > 0)
            const available = typeStocks.reduce((sum, s) => sum + s.quantity, 0)

            if (available < req.required) {
              shortages.push({
                feedTypeId,
                feedTypeName: req.feedTypeName,
                required: Number(req.required.toFixed(2)),
                available: Number(available.toFixed(2))
              })
              continue
            }

            let remaining = req.required
            const updates: Array<{ stockId: string; nextQty: number; used: number; cost: number }> = []
            let totalCost = 0

            for (const stock of typeStocks) {
              if (remaining <= 0) break
              const used = Math.min(stock.quantity, remaining)
              const nextQty = Number((stock.quantity - used).toFixed(4))
              const unitCost = stock.cost || 0
              const itemCost = unitCost * used
              totalCost += itemCost
              updates.push({ stockId: stock.id, nextQty, used: Number(used.toFixed(4)), cost: itemCost })
              // Update in-memory for subsequent entries in this loop
              stock.quantity = nextQty
              remaining -= used
            }

            plans.push({
              feedTypeId,
              feedTypeName: req.feedTypeName,
              required: Number(req.required.toFixed(2)),
              updates,
              totalCost: Number(totalCost.toFixed(2)),
              byPen: req.byPen
            })
          }

          if (shortages.length > 0) {
            return { shortages, skipped: false as const }
          }

          // Execute stock updates
          for (const plan of plans) {
            for (const update of plan.updates) {
              await tx.feedStock.update({ where: { id: update.stockId }, data: { quantity: update.nextQty } })
            }
          }

// CR-02: Aggregate by penId before creating DailyFeedConsumption
          for (const plan of plans) {
            for (const [penKey, penQuantity] of plan.byPen.entries()) {
              if (penQuantity <= 0) continue
              const actualPenId = penKey === '__none__' ? null : penKey
              const penCost = plan.required > 0 ? (plan.totalCost / plan.required) * penQuantity : 0

              // CR-03: Manual findFirst + update/create instead of upsert (MySQL NULL != NULL in unique)
              const existingRecord = await tx.dailyFeedConsumption.findFirst({
                where: {
                  tenantId: auth.tenantId,
                  date: pendingDate,
                  feedTypeId: plan.feedTypeId,
                  penId: actualPenId
                }
              })

              if (existingRecord) {
                await tx.dailyFeedConsumption.update({
                  where: { id: existingRecord.id },
                  data: {
                    quantity: { increment: Number(penQuantity.toFixed(2)) },
                    cost: { increment: Number(penCost.toFixed(2)) }
                  }
                })
              } else {
                await tx.dailyFeedConsumption.create({
                  data: {
                    date: pendingDate,
                    feedTypeId: plan.feedTypeId,
                    penId: actualPenId,
                    quantity: Number(penQuantity.toFixed(2)),
                    cost: Number(penCost.toFixed(2))
                  }
                })
              }
            }
          }

          // Create marker
          await tx.activityLog.create({
            data: { userId: actorId, action: 'CREATE', entity: 'FeedConsumption', entityId: key, description: `تنفيذ صرف أعلاف يومي (${key})`, ipAddress, userAgent }
          })

          return { plans, skipped: false as const }
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

        if (!result || result.skipped) continue

        if ('shortages' in result && result.shortages) {
          if (!isAuto) {
            return NextResponse.json({ error: 'المخزون غير كافٍ لتنفيذ الصرف المطلوب', shortages: result.shortages }, { status: 400 })
          }
          skippedDates.push({ date: key, shortages: result.shortages })
          continue
        }

        executedDates.push(key)
        if ('plans' in result && result.plans) {
          for (const plan of result.plans) {
            const existing = consumedByType.get(plan.feedTypeId)
            if (existing) {
              existing.consumedKg += plan.required
            } else {
              consumedByType.set(plan.feedTypeId, { feedTypeName: plan.feedTypeName, consumedKg: plan.required })
            }
          }
        }
      } catch (error) {
        // Race condition or unique constraint — skip this date
        console.warn(`Consume skipped for ${key}:`, error instanceof Error ? error.message : error)
        continue
      }
    }

    const consumed = Array.from(consumedByType.entries()).map(([feedTypeId, v]) => ({
      feedTypeId,
      feedTypeName: v.feedTypeName,
      consumedKg: Number(v.consumedKg.toFixed(2))
    }))
    const totalConsumed = consumed.reduce((sum, item) => sum + item.consumedKg, 0)

    return NextResponse.json({
      success: executedDates.length > 0,
      auto: isAuto,
      date: dateKey(targetDate),
      executedDates,
      skippedDates,
      consumed,
      totalConsumed: Number(totalConsumed.toFixed(2)),
      message: isAuto
        ? executedDates.length > 0
          ? `تم تنفيذ الصرف التلقائي لعدد ${executedDates.length} يوم`
          : 'تعذر تنفيذ الصرف التلقائي بسبب نقص المخزون في الأيام المطلوبة'
        : 'تم تنفيذ صرف الأعلاف اليومي بنجاح'
    })
  
    })
} catch (error) {
    console.error('Feed consumption execution error:', error)
    return NextResponse.json({ error: 'فشل في تنفيذ صرف الأعلاف اليومي' }, { status: 500 })
  }
}
