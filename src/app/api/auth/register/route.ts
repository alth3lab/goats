import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken, TOKEN_COOKIE, TOKEN_MAX_AGE } from '@/lib/jwt'

export const runtime = 'nodejs'

// Rate limit: 3 registrations per IP per 15 min
const registerAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_REG_ATTEMPTS = 3
const REG_WINDOW_MS = 15 * 60 * 1000

export async function POST(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const now = Date.now()
    const record = registerAttempts.get(clientIp)
    if (record && now < record.resetAt && record.count >= MAX_REG_ATTEMPTS) {
      return NextResponse.json(
        { error: 'تم تجاوز عدد المحاولات. حاول مرة أخرى لاحقاً' },
        { status: 429 }
      )
    }
    if (!record || now > (record?.resetAt ?? 0)) {
      registerAttempts.set(clientIp, { count: 1, resetAt: now + REG_WINDOW_MS })
    } else {
      record.count++
    }

    const body = await request.json()
    const {
      farmName,
      fullName,
      email,
      username,
      password,
      phone,
      farmType,
    } = body

    // Validation
    if (!farmName || !fullName || !email || !username || !password) {
      return NextResponse.json(
        { error: 'جميع الحقول المطلوبة يجب تعبئتها' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' },
        { status: 400 }
      )
    }

    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: 'كلمة المرور يجب أن تحتوي على حرف كبير ورقم على الأقل' },
        { status: 400 }
      )
    }

    // Check uniqueness
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    })

    if (existingUser) {
      const field = existingUser.email === email ? 'البريد الإلكتروني' : 'اسم المستخدم'
      return NextResponse.json(
        { error: `${field} مستخدم بالفعل` },
        { status: 409 }
      )
    }

    const existingTenant = await prisma.tenant.findFirst({
      where: { email }
    })

    if (existingTenant) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني مسجل بالفعل كمزرعة' },
        { status: 409 }
      )
    }

    // Create tenant + farm + user in transaction
    const hashedPassword = await bcrypt.hash(password, 12)

    // Trial period: 14 days
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14)

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create tenant with trial period
      const tenant = await tx.tenant.create({
        data: {
          name: farmName,
          nameAr: farmName,
          email,
          phone: phone || null,
          plan: 'FREE',
          maxFarms: 1,
          maxGoats: 50,
          maxUsers: 2,
          trialEndsAt,
        }
      })

      // 2. Create default farm
      const validFarmTypes = ['GOAT', 'SHEEP', 'CAMEL', 'MIXED']
      const resolvedFarmType = validFarmTypes.includes(farmType) ? farmType : 'GOAT'
      const farm = await tx.farm.create({
        data: {
          tenantId: tenant.id,
          name: farmName,
          nameAr: farmName,
          farmType: resolvedFarmType,
          phone: phone || null,
          currency: 'AED',
        }
      })

      // 3. Create owner user
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          username,
          email,
          password: hashedPassword,
          fullName,
          phone: phone || null,
          role: 'OWNER',
        }
      })

      // 4. Link user to farm
      await tx.userFarm.create({
        data: {
          userId: user.id,
          farmId: farm.id,
          role: 'OWNER',
        }
      })

      return { tenant, farm, user }
    })

    // Sign JWT
    const token = await signToken({
      userId: result.user.id,
      role: result.user.role,
      tenantId: result.tenant.id,
      farmId: result.farm.id,
    })

    const response = NextResponse.json({
      id: result.user.id,
      fullName: result.user.fullName,
      role: result.user.role,
      tenantId: result.tenant.id,
      farmId: result.farm.id,
      farmName: result.farm.name,
    }, { status: 201 })

    response.cookies.set(TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: TOKEN_MAX_AGE,
    })

    return response
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'فشل في إنشاء الحساب' },
      { status: 500 }
    )
  }
}
