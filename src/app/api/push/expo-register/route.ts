import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'

/**
 * POST — Register an Expo push token from the mobile app
 * Body: { token, platform? }
 */
export async function POST(request: NextRequest) {
  try {
    const authData = await requireAuth(request)
    if (authData.response) return authData.response

    return runWithTenant(authData.tenantId, authData.farmId, async () => {
      const body = await request.json()
      const { token, platform } = body as { token?: string; platform?: string }

      if (!token || typeof token !== 'string') {
        return NextResponse.json(
          { error: 'رمز الإشعارات مطلوب' },
          { status: 400 }
        )
      }

      // Validate Expo push token format: ExponentPushToken[...] or ExpoPushToken[...]
      if (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) {
        return NextResponse.json(
          { error: 'صيغة رمز الإشعارات غير صحيحة' },
          { status: 400 }
        )
      }

      await prisma.expoPushToken.upsert({
        where: {
          userId_token: {
            userId: authData.user.id,
            token,
          }
        },
        update: {
          farmId: authData.farmId,
          platform: platform || null,
          updatedAt: new Date(),
        },
        create: {
          userId: authData.user.id,
          tenantId: authData.tenantId,
          farmId: authData.farmId,
          token,
          platform: platform || null,
        }
      })

      return NextResponse.json({ success: true, message: 'تم تسجيل رمز الإشعارات' })
    })
  } catch (error) {
    console.error('Expo token register error:', error)
    return NextResponse.json({ error: 'فشل في تسجيل رمز الإشعارات' }, { status: 500 })
  }
}

/**
 * DELETE — Unregister an Expo push token
 * Body: { token }
 */
export async function DELETE(request: NextRequest) {
  try {
    const authData = await requireAuth(request)
    if (authData.response) return authData.response

    return runWithTenant(authData.tenantId, authData.farmId, async () => {
      const body = await request.json()
      const { token } = body as { token?: string }

      if (!token) {
        return NextResponse.json({ error: 'رمز الإشعارات مطلوب' }, { status: 400 })
      }

      await prisma.expoPushToken.deleteMany({
        where: {
          userId: authData.user.id,
          token,
        }
      })

      return NextResponse.json({ success: true, message: 'تم إلغاء تسجيل رمز الإشعارات' })
    })
  } catch (error) {
    console.error('Expo token unregister error:', error)
    return NextResponse.json({ error: 'فشل في إلغاء تسجيل رمز الإشعارات' }, { status: 500 })
  }
}
