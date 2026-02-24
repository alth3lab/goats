import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'

/**
 * POST — Subscribe to push notifications
 * Body: { endpoint, keys: { p256dh, auth } }
 */
export async function POST(request: NextRequest) {
  try {
    const authData = await requireAuth(request)
    if (authData.response) return authData.response

    return runWithTenant(authData.tenantId, authData.farmId, async () => {
      const body = await request.json()
      const { endpoint, keys } = body

      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return NextResponse.json(
          { error: 'بيانات الاشتراك غير مكتملة' },
          { status: 400 }
        )
      }

      // Upsert — if same endpoint exists for user, update keys
      await prisma.pushSubscription.upsert({
        where: {
          userId_endpoint: {
            userId: authData.user.id,
            endpoint: endpoint,
          }
        },
        update: {
          p256dh: keys.p256dh,
          auth: keys.auth,
          farmId: authData.farmId,
          updatedAt: new Date(),
        },
        create: {
          userId: authData.user.id,
          tenantId: authData.tenantId,
          farmId: authData.farmId,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        }
      })

      return NextResponse.json({ success: true, message: 'تم تفعيل الإشعارات' })
    })
  } catch (error) {
    console.error('Push subscribe error:', error)
    return NextResponse.json({ error: 'فشل في حفظ الاشتراك' }, { status: 500 })
  }
}

/**
 * DELETE — Unsubscribe from push notifications
 * Body: { endpoint }
 */
export async function DELETE(request: NextRequest) {
  try {
    const authData = await requireAuth(request)
    if (authData.response) return authData.response

    return runWithTenant(authData.tenantId, authData.farmId, async () => {
      const body = await request.json()
      const { endpoint } = body

      if (!endpoint) {
        return NextResponse.json({ error: 'الـ endpoint مطلوب' }, { status: 400 })
      }

      await prisma.pushSubscription.deleteMany({
        where: {
          userId: authData.user.id,
          endpoint,
        }
      })

      return NextResponse.json({ success: true, message: 'تم إلغاء الإشعارات' })
    })
  } catch (error) {
    console.error('Push unsubscribe error:', error)
    return NextResponse.json({ error: 'فشل في إلغاء الاشتراك' }, { status: 500 })
  }
}

/**
 * GET — Check if user has an active push subscription
 */
export async function GET(request: NextRequest) {
  try {
    const authData = await requireAuth(request)
    if (authData.response) return authData.response

    return runWithTenant(authData.tenantId, authData.farmId, async () => {
      const count = await prisma.pushSubscription.count({
        where: { userId: authData.user.id }
      })

      return NextResponse.json({ subscribed: count > 0, count })
    })
  } catch (error) {
    console.error('Push status error:', error)
    return NextResponse.json({ error: 'فشل في التحقق' }, { status: 500 })
  }
}
