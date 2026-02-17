import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'

export const runtime = 'nodejs'

type RequiredItem = { feedTypeName: string; required: number }

function dayStart(input: Date | string) {
  const d = new Date(input)
  d.setHours(0, 0, 0, 0)
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

async function resolveActorId(request: NextRequest) {
  const fromCookie = await getUserIdFromRequest(request)
  if (fromCookie) return fromCookie

  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN', isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true }
  })
  if (admin) return admin.id

  const anyActive = await prisma.user.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true }
  })
  return anyActive?.id || null
}

/* ── حساب المطلوب من الجداول المخزنة مسبقاً (بدون استعلام DB) ── */
function requiredForDateFromCache(
  targetDate: Date,
  allSchedules: Array<{
    feedTypeId: string
    feedType: { nameAr: string }
    quantity: number
    startDate: Date
    endDate: Date | null
    pen: { _count: { goats: number } } | null
  }>
): Map<string, RequiredItem> {
  const result = new Map<string, RequiredItem>()
  const t = dayStart(targetDate).getTime()

  for (const s of allSchedules) {
    if (dayStart(s.startDate).getTime() > t) continue
    if (s.endDate && dayStart(s.endDate).getTime() < t) continue

    const heads = s.pen?._count?.goats || 0
    const required = s.quantity * heads
    if (required <= 0) continue

    const existing = result.get(s.feedTypeId)
    if (existing) {
      existing.required += required
    } else {
      result.set(s.feedTypeId, { feedTypeName: s.feedType.nameAr, required })
    }
  }
  return result
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'manage_feeds')
    if (auth.response) return auth.response

    const actorId = await resolveActorId(request)
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

      executionDates = dateRange(earliest, targetDate)
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

    /* ── تحميل الجداول والمخزون مرة واحدة فقط ── */
    const allSchedules = await prisma.feedingSchedule.findMany({
      where: { isActive: true },
      include: {
        feedType: { select: { nameAr: true } },
        pen: { include: { _count: { select: { goats: true } } } }
      }
    })

    // تحميل كل المخزون المتاح مرة واحدة (FIFO)
    let allStocks = await prisma.feedStock.findMany({
      where: { quantity: { gt: 0 } },
      orderBy: [{ purchaseDate: 'asc' }, { createdAt: 'asc' }]
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
        await prisma.activityLog.create({
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
        executedDates.push(key)
        continue
      }

      /* فحص الكفاية + بناء خطة الخصم من المخزون المحمّل في الذاكرة */
      const shortages: Array<{ feedTypeId: string; feedTypeName: string; required: number; available: number }> = []
      const plans: Array<{ 
        feedTypeId: string; 
        feedTypeName: string; 
        required: number; 
        totalCost: number;
        updates: Array<{ stockId: string; nextQty: number; used: number; cost: number }> 
      }> = []

      for (const [feedTypeId, req] of requiredByFeedType.entries()) {
        const typeStocks = allStocks.filter((s) => s.feedTypeId === feedTypeId && s.quantity > 0)
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
          const stockCost = stock.cost || 0
          const itemCost = (stockCost / (stock.quantity + used)) * used  // تكلفة الكمية المستخدمة من هذه الدفعة
          totalCost += itemCost
          updates.push({ stockId: stock.id, nextQty, used: Number(used.toFixed(4)), cost: itemCost })
          remaining -= used
        }

        plans.push({ feedTypeId, feedTypeName: req.feedTypeName, required: Number(req.required.toFixed(2)), updates, totalCost: Number(totalCost.toFixed(2)) })
      }

      if (shortages.length > 0) {
        if (!isAuto) {
          return NextResponse.json({ error: 'المخزون غير كافٍ لتنفيذ الصرف المطلوب', shortages }, { status: 400 })
        }
        skippedDates.push({ date: key, shortages })
        continue
      }

      /* تنفيذ الخصم في قاعدة البيانات */
      await prisma.$transaction(async (tx) => {
        // تحديث المخزون
        for (const plan of plans) {
          for (const update of plan.updates) {
            await tx.feedStock.update({ where: { id: update.stockId }, data: { quantity: update.nextQty } })
          }
        }
        
        // حفظ سجلات الصرف التفصيلية في DailyFeedConsumption
        for (const plan of plans) {
          // البحث عن الحظائر التي تستخدم هذا النوع من العلف في هذا التاريخ
          const schedulesForType = allSchedules.filter(
            (s) => s.feedTypeId === plan.feedTypeId && 
                   dayStart(s.startDate) <= pendingDate && 
                   (!s.endDate || dayStart(s.endDate) >= pendingDate)
          )
          
          // حفظ سجل لكل حظيرة أو سجل واحد إذا لم يكن مرتبط بحظائر
          if (schedulesForType.length > 0) {
            for (const schedule of schedulesForType) {
              const penQuantity = schedule.quantity * (schedule.pen?._count?.goats || 0)
              if (penQuantity > 0) {
                const penCost = (plan.totalCost / plan.required) * penQuantity
                await tx.dailyFeedConsumption.create({
                  data: {
                    date: pendingDate,
                    feedTypeId: plan.feedTypeId,
                    penId: schedule.penId,
                    quantity: Number(penQuantity.toFixed(2)),
                    cost: Number(penCost.toFixed(2))
                  }
                })
              }
            }
          } else {
            // إذا لم يكن هناك جداول (لا ينبغي أن يحدث، لكن للأمان)
            await tx.dailyFeedConsumption.create({
              data: {
                date: pendingDate,
                feedTypeId: plan.feedTypeId,
                penId: null,
                quantity: plan.required,
                cost: plan.totalCost
              }
            })
          }
        }
        
        // حفظ marker في ActivityLog
        await tx.activityLog.create({
          data: { userId: actorId, action: 'CREATE', entity: 'FeedConsumption', entityId: key, description: `تنفيذ صرف أعلاف يومي (${key})`, ipAddress, userAgent }
        })
      })

      /* تحديث المخزون المحلي حتى تتناسب الأيام اللاحقة */
      for (const plan of plans) {
        for (const update of plan.updates) {
          const idx = allStocks.findIndex((s) => s.id === update.stockId)
          if (idx !== -1) allStocks[idx] = { ...allStocks[idx], quantity: update.nextQty }
        }
      }
      // حذف المخزون المنتهي
      allStocks = allStocks.filter((s) => s.quantity > 0)

      executedDates.push(key)
      for (const plan of plans) {
        const existing = consumedByType.get(plan.feedTypeId)
        if (existing) {
          existing.consumedKg += plan.required
        } else {
          consumedByType.set(plan.feedTypeId, { feedTypeName: plan.feedTypeName, consumedKg: plan.required })
        }
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
  } catch (error) {
    console.error('Feed consumption execution error:', error)
    return NextResponse.json({ error: 'فشل في تنفيذ صرف الأعلاف اليومي' }, { status: 500 })
  }
}
