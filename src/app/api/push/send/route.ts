import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { webpush } from '@/lib/webpush'
import { requireAuth } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'
import { formatDate } from '@/lib/formatters'

export const runtime = 'nodejs'

interface AlertPayload {
  id: string
  type: string
  severity: string
  title: string
  message: string
  date?: string | Date | null
}

/**
 * POST — Send push notifications for current alerts
 * Can be called manually or by a cron job
 * Body: { alerts?: AlertPayload[] }   — optional, if not provided fetches from /api/alerts
 */
export async function POST(request: NextRequest) {
  try {
    const authData = await requireAuth(request)
    if (authData.response) return authData.response

    return runWithTenant(authData.tenantId, authData.farmId, async () => {
      const body = await request.json().catch(() => ({}))
      let alerts: AlertPayload[] = body.alerts || []

      // If no alerts provided, fetch from alerts API internally
      if (alerts.length === 0) {
        alerts = await fetchAlertsInternal(authData.tenantId, authData.farmId)
      }

      if (alerts.length === 0) {
        return NextResponse.json({ sent: 0, message: 'لا توجد تنبيهات حالية' })
      }

      // Get all push subscriptions for this farm
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { farmId: authData.farmId }
      })

      const expoTokenCount = await prisma.expoPushToken.count({
        where: { farmId: authData.farmId }
      })

      if (subscriptions.length === 0 && expoTokenCount === 0) {
        return NextResponse.json({ sent: 0, message: 'لا يوجد مشتركون في الإشعارات' })
      }

      // Build notification payload
      const urgentAlerts = alerts.filter(a => a.severity === 'error' || a.severity === 'warning')
      const alertsToSend = urgentAlerts.length > 0 ? urgentAlerts : alerts.slice(0, 5)

      const typeIcons: Record<string, string> = {
        BIRTH: '🤰',
        HEALTH: '💉',
        WEANING: '🍼',
        PEN_CAPACITY: '🏠',
        DEATHS: '💀',
        BREEDING_OVERDUE: '⏰',
        LOW_STOCK: '📦',
        EXPIRING_FEED: '🌾',
      }

      let sent = 0
      let failed = 0
      const expiredEndpoints: string[] = []

      for (const sub of subscriptions) {
        const pushSub = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        }

        // Send one notification per urgent alert, max 3
        const toSend = alertsToSend.slice(0, 3)
        
        for (const alert of toSend) {
          const icon = typeIcons[alert.type] || '🔔'
          const payload = JSON.stringify({
            title: `${icon} ${alert.title}`,
            body: alert.message,
            url: getAlertUrl(alert.type),
            requireInteraction: alert.severity === 'error',
            actions: [
              { action: 'open', title: 'فتح التطبيق' },
              { action: 'dismiss', title: 'تجاهل' },
            ]
          })

          try {
            await webpush.sendNotification(pushSub, payload)
            sent++
          } catch (err: unknown) {
            const error = err as { statusCode?: number }
            if (error.statusCode === 410 || error.statusCode === 404) {
              // Subscription expired or invalid — mark for cleanup
              expiredEndpoints.push(sub.endpoint)
            }
            failed++
          }
        }
      }

      // Cleanup expired subscriptions
      if (expiredEndpoints.length > 0) {
        await prisma.pushSubscription.deleteMany({
          where: { endpoint: { in: expiredEndpoints } }
        })
      }

      // ── Send to mobile devices via Expo Push API ──
      let expoSent = 0
      let expoFailed = 0
      const expiredTokenIds: string[] = []

      const expoTokens = await prisma.expoPushToken.findMany({
        where: { farmId: authData.farmId }
      })

      if (expoTokens.length > 0) {
        const toSend = alertsToSend.slice(0, 3)
        const messages = expoTokens.flatMap(t =>
          toSend.map(alert => {
            const icon = typeIcons[alert.type] || '🔔'
            return {
              to: t.token,
              title: `${icon} ${alert.title}`,
              body: alert.message,
              data: { url: getAlertUrl(alert.type) },
              sound: 'default' as const,
              _tokenId: t.id,
            }
          })
        )

        // Send in batches of 100 (Expo limit)
        for (let i = 0; i < messages.length; i += 100) {
          const batch = messages.slice(i, i + 100)
          try {
            const res = await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: JSON.stringify(batch.map(({ _tokenId, ...msg }) => msg)),
            })
            const result = await res.json()
            const tickets = result.data || []
            for (let j = 0; j < tickets.length; j++) {
              if (tickets[j].status === 'ok') {
                expoSent++
              } else {
                expoFailed++
                if (tickets[j].details?.error === 'DeviceNotRegistered') {
                  expiredTokenIds.push(batch[j]._tokenId)
                }
              }
            }
          } catch {
            expoFailed += batch.length
          }
        }

        // Cleanup expired Expo tokens
        if (expiredTokenIds.length > 0) {
          await prisma.expoPushToken.deleteMany({
            where: { id: { in: expiredTokenIds } }
          })
        }
      }

      return NextResponse.json({
        sent: sent + expoSent,
        failed: failed + expoFailed,
        cleaned: expiredEndpoints.length + expiredTokenIds.length,
        subscribers: subscriptions.length + expoTokens.length,
        alertsProcessed: alertsToSend.length,
      })
    })
  } catch (error) {
    console.error('Push send error:', error)
    return NextResponse.json({ error: 'فشل في إرسال الإشعارات' }, { status: 500 })
  }
}

function getAlertUrl(type: string): string {
  switch (type) {
    case 'BIRTH':
    case 'BREEDING_OVERDUE':
      return '/dashboard/breeding'
    case 'HEALTH':
      return '/dashboard/health'
    case 'WEANING':
      return '/dashboard/goats'
    case 'PEN_CAPACITY':
      return '/dashboard/pens'
    case 'LOW_STOCK':
      return '/dashboard/inventory'
    case 'EXPIRING_FEED':
      return '/dashboard/feeds'
    default:
      return '/dashboard'
  }
}

/**
 * Fetch alerts internally (same logic as /api/alerts but direct DB query)
 */
async function fetchAlertsInternal(tenantId: string | undefined, farmId: string | undefined): Promise<AlertPayload[]> {
  const today = new Date()
  const nextMonth = new Date()
  nextMonth.setDate(today.getDate() + 30)

  const farm = await prisma.farm.findUnique({ where: { id: farmId } })
  const alertBreedingOverdueDays = farm?.alertBreedingOverdueDays ?? 150

  const [upcomingBirths, upcomingVaccinations] = await Promise.all([
    prisma.breeding.findMany({
      where: {
        pregnancyStatus: { in: ['PREGNANT', 'MATED'] },
        dueDate: { gte: today, lte: nextMonth },
        mother: { status: 'ACTIVE' }
      },
      include: { mother: { include: { breed: true } } },
      orderBy: { dueDate: 'asc' },
      take: 10,
    }),
    prisma.healthRecord.findMany({
      where: {
        nextDueDate: { lte: nextMonth, not: null },
        goat: { status: 'ACTIVE' }
      },
      include: { goat: { select: { tagId: true } } },
      orderBy: { nextDueDate: 'asc' },
      take: 10,
    }),
  ])

  const alerts: AlertPayload[] = []

  for (const record of upcomingBirths) {
    const severity = getSeverity(new Date(record.dueDate!), today)
    alerts.push({
      id: `birth-${record.id}`,
      type: 'BIRTH',
      severity,
      title: 'ولادة متوقعة',
      message: `الأم ${record.mother.tagId} - متوقع: ${formatDate(record.dueDate!)}`,
      date: record.dueDate,
    })
  }

  for (const record of upcomingVaccinations) {
    const severity = getSeverity(new Date(record.nextDueDate!), today)
    alerts.push({
      id: `health-${record.id}`,
      type: 'HEALTH',
      severity,
      title: 'تطعيم/علاج مستحق',
      message: `${record.type === 'VACCINATION' ? 'تطعيم' : 'علاج'} - ${record.goat.tagId} - ${formatDate(record.nextDueDate!)}`,
      date: record.nextDueDate,
    })
  }

  return alerts
}

function getSeverity(date: Date, today: Date): string {
  const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'error'
  if (diffDays <= 3) return 'warning'
  return 'info'
}
