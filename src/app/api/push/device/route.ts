import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

/**
 * POST /api/push/device — تسجيل جهاز محمول (iOS/Android) لتلقي الإشعارات
 * Body: { deviceToken, platform, deviceName?, appVersion?, osVersion? }
 */
export async function POST(request: NextRequest) {
  try {
    const authData = await requireAuth(request)
    if (authData.response) return authData.response

    const body = await request.json()
    const { deviceToken, platform, deviceName, appVersion, osVersion } = body

    if (!deviceToken || !platform) {
      return NextResponse.json(
        { error: 'بيانات الجهاز غير مكتملة. يجب إرسال deviceToken و platform' },
        { status: 400 }
      )
    }

    if (!['ios', 'android'].includes(platform)) {
      return NextResponse.json(
        { error: 'المنصة غير مدعومة. القيم المسموحة: ios, android' },
        { status: 400 }
      )
    }

    // Upsert — if same device token exists for user, update info
    await prisma.mobileDevice.upsert({
      where: {
        userId_deviceToken: {
          userId: authData.user.id,
          deviceToken,
        }
      },
      update: {
        platform,
        deviceName: deviceName || undefined,
        appVersion: appVersion || undefined,
        osVersion: osVersion || undefined,
        farmId: authData.farmId,
        isActive: true,
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        userId: authData.user.id,
        tenantId: authData.tenantId || '',
        farmId: authData.farmId || '',
        deviceToken,
        platform,
        deviceName: deviceName || null,
        appVersion: appVersion || null,
        osVersion: osVersion || null,
      }
    })

    logger.info('Mobile device registered', {
      userId: authData.user.id,
      platform,
      deviceName,
    })

    return NextResponse.json({ success: true, message: 'تم تسجيل الجهاز بنجاح' })
  } catch (error) {
    logger.error('Device registration error:', { error: String(error) })
    return NextResponse.json({ error: 'فشل في تسجيل الجهاز' }, { status: 500 })
  }
}

/**
 * DELETE /api/push/device — إلغاء تسجيل جهاز محمول (عند تسجيل الخروج من التطبيق)
 * Body: { deviceToken }
 */
export async function DELETE(request: NextRequest) {
  try {
    const authData = await requireAuth(request)
    if (authData.response) return authData.response

    const body = await request.json()
    const { deviceToken } = body

    if (!deviceToken) {
      return NextResponse.json(
        { error: 'يجب إرسال deviceToken' },
        { status: 400 }
      )
    }

    // Soft delete — mark as inactive
    await prisma.mobileDevice.updateMany({
      where: {
        userId: authData.user.id,
        deviceToken,
      },
      data: { isActive: false }
    })

    logger.info('Mobile device unregistered', {
      userId: authData.user.id,
    })

    return NextResponse.json({ success: true, message: 'تم إلغاء تسجيل الجهاز' })
  } catch (error) {
    logger.error('Device unregister error:', { error: String(error) })
    return NextResponse.json({ error: 'فشل في إلغاء تسجيل الجهاز' }, { status: 500 })
  }
}

/**
 * GET /api/push/device — جلب أجهزة المستخدم المسجلة
 */
export async function GET(request: NextRequest) {
  try {
    const authData = await requireAuth(request)
    if (authData.response) return authData.response

    const devices = await prisma.mobileDevice.findMany({
      where: {
        userId: authData.user.id,
        isActive: true,
      },
      select: {
        id: true,
        platform: true,
        deviceName: true,
        appVersion: true,
        osVersion: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { lastUsedAt: 'desc' }
    })

    return NextResponse.json({ devices })
  } catch (error) {
    logger.error('Get devices error:', { error: String(error) })
    return NextResponse.json({ error: 'فشل في جلب الأجهزة' }, { status: 500 })
  }
}
