import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'
import { signToken, TOKEN_COOKIE, TOKEN_MAX_AGE } from '@/lib/jwt'

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

    // Only accept bcrypt-hashed passwords
    let isValid = false
    if (user.password.startsWith('$2')) {
      isValid = await bcrypt.compare(password, user.password)
    } else {
      // Migrate plaintext password to bcrypt on successful match
      if (user.password === password) {
        const hashed = await bcrypt.hash(password, 12)
        await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })
        isValid = true
      }
    }

    if (!isValid) {
      return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 })
    }

    // Clear rate limit on successful login
    clearRateLimit(clientIp)

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    })

    await logActivity({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      description: `تسجيل دخول المستخدم: ${user.fullName}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    // Sign JWT token
    const token = await signToken({ userId: user.id, role: user.role })

    const response = NextResponse.json({
      id: user.id,
      fullName: user.fullName,
      role: user.role
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
    return NextResponse.json({ error: 'فشل تسجيل الدخول' }, { status: 500 })
  }
}
