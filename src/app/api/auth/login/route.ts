import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
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

    let isValid = false
    if (user.password.startsWith('$2')) {
      isValid = await bcrypt.compare(password, user.password)
    } else {
      isValid = user.password === password
    }

    if (!isValid) {
      return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 })
    }

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

    const response = NextResponse.json({
      id: user.id,
      fullName: user.fullName,
      role: user.role
    })

    response.cookies.set('userId', user.id, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/'
    })

    return response
  } catch (error) {
    return NextResponse.json({ error: 'فشل تسجيل الدخول' }, { status: 500 })
  }
}
