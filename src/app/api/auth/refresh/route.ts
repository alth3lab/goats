import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, signToken, TOKEN_COOKIE, TOKEN_MAX_AGE } from '@/lib/jwt'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

function isSecureRequest(request: NextRequest): boolean {
  const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '')
  return proto === 'https'
}

/**
 * POST /api/auth/refresh
 * تجديد التوكن - يستخدم من تطبيق الايفون لتجديد الجلسة بدون إعادة تسجيل الدخول
 * يقبل Bearer token أو cookie
 */
export async function POST(request: NextRequest) {
  try {
    // Support both cookie (web) and Bearer token (mobile app)
    let token = request.cookies.get(TOKEN_COOKIE)?.value
    if (!token) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7)
      }
    }

    if (!token) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'التوكن منتهي أو غير صالح' }, { status: 401 })
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, isActive: true, role: true, tenantId: true }
    })

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'الحساب غير نشط أو غير موجود' }, { status: 401 })
    }

    // Check tenant is still active
    if (user.role !== 'SUPER_ADMIN' && user.tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { isActive: true }
      })
      if (tenant && !tenant.isActive) {
        return NextResponse.json({ error: 'الحساب موقوف. يرجى التواصل مع الدعم.', reason: 'deactivated' }, { status: 401 })
      }
    }

    // Sign new token with same context
    const newToken = await signToken({
      userId: payload.userId,
      role: payload.role,
      tenantId: payload.tenantId,
      farmId: payload.farmId
    })

    logger.info('Token refreshed', { userId: payload.userId })

    const response = NextResponse.json({
      token: newToken,
      expiresIn: TOKEN_MAX_AGE,
    })

    // Also set cookie for web
    response.cookies.set(TOKEN_COOKIE, newToken, {
      httpOnly: true,
      secure: isSecureRequest(request),
      sameSite: 'lax',
      path: '/',
      maxAge: TOKEN_MAX_AGE,
    })

    return response
  } catch (error) {
    logger.error('Token refresh error', { error: String(error) })
    return NextResponse.json({ error: 'فشل تجديد التوكن' }, { status: 500 })
  }
}
