import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken, TOKEN_COOKIE, TOKEN_MAX_AGE } from '@/lib/jwt'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      farmName,
      fullName,
      email,
      username,
      password,
      phone,
    } = body

    // Validation
    if (!farmName || !fullName || !email || !username || !password) {
      return NextResponse.json(
        { error: 'جميع الحقول المطلوبة يجب تعبئتها' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' },
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

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create tenant
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
        }
      })

      // 2. Create default farm
      const farm = await tx.farm.create({
        data: {
          tenantId: tenant.id,
          name: farmName,
          nameAr: farmName,
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
