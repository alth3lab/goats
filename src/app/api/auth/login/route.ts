import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'
import { signToken, TOKEN_COOKIE, TOKEN_MAX_AGE } from '@/lib/jwt'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

// Simple in-memory rate limiter
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = loginAttempts.get(ip)
  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  record.count++
  return record.count > MAX_ATTEMPTS
}

function clearRateLimit(ip: string) {
  loginAttempts.delete(ip)
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

    // Rate limiting check
    if (isRateLimited(clientIp)) {
      logger.warn('Login rate limited', { ip: clientIp })
      return NextResponse.json(
        { error: 'تم تجاوز عدد المحاولات المسموح. حاول مرة أخرى بعد 15 دقيقة' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const identifier = String(body.identifier || '').trim()
    const password = String(body.password || '')

    if (!identifier || !password) {
      return NextResponse.json({ error: 'البيانات غير مكتملة' }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: {
        isActive: true,
        OR: [{ username: identifier }, { email: identifier }]
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 })
    }

    // Verify bcrypt-hashed password only
    const isValid = user.password.startsWith('$2')
      ? await bcrypt.compare(password, user.password)
      : false

    if (!isValid) {
      logger.warn('Login failed - invalid password', { ip: clientIp, identifier })
      return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 })
    }

    // Clear rate limit on successful login
    clearRateLimit(clientIp)
    logger.info('Login successful', { userId: user.id, ip: clientIp })

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    })

    // Get user's default farm
    const userFarm = await prisma.userFarm.findFirst({
      where: { userId: user.id },
      include: { farm: true },
      orderBy: { farm: { createdAt: 'asc' } }
    })

    // Backward compatibility: legacy global admins created before multi-tenant may have no tenant/farm
    const isLegacyGlobalAdmin = user.role === 'ADMIN' && !user.tenantId
    const effectiveRole = isLegacyGlobalAdmin ? 'SUPER_ADMIN' : user.role

    // SUPER_ADMIN (and legacy global admin) can login without tenant/farm; others need both
    if (!user.tenantId && effectiveRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'لم يتم ربط الحساب بمستأجر' }, { status: 403 })
    }
    if (!userFarm && effectiveRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'لم يتم ربط الحساب بمزرعة' }, { status: 403 })
    }

    const farmId = userFarm?.farmId || ''
    const tenantId = user.tenantId || ''

    await logActivity({
      userId: user.id,
      tenantId,
      farmId,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      description: `تسجيل دخول المستخدم: ${user.fullName}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    // Sign JWT token with tenant context
    const token = await signToken({
      userId: user.id,
      role: effectiveRole,
      tenantId,
      farmId
    })

    const response = NextResponse.json({
      id: user.id,
      fullName: user.fullName,
      role: effectiveRole,
      tenantId,
      farmId,
      farmName: userFarm?.farm.name || '',
    })

    response.cookies.set(TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: TOKEN_MAX_AGE,
    })

    return response
  } catch (error) {
    logger.error('Login error', { error: String(error) })
    return NextResponse.json({ error: 'فشل تسجيل الدخول' }, { status: 500 })
  }
}
