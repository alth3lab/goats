import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { signToken, TOKEN_COOKIE, TOKEN_MAX_AGE } from '@/lib/jwt'

export const runtime = 'nodejs'

// POST /api/farms/switch - switch active farm
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const { user, tenantId } = auth

  const { farmId } = await request.json()
  if (!farmId) {
    return NextResponse.json({ error: 'معرّف المزرعة مطلوب' }, { status: 400 })
  }

  // Verify user has access to this farm
  const userFarm = await prisma.userFarm.findUnique({
    where: { userId_farmId: { userId: user.id, farmId } },
    include: { farm: true }
  })

  if (!userFarm) {
    return NextResponse.json({ error: 'ليس لديك صلاحية الوصول لهذه المزرعة' }, { status: 403 })
  }

  // Issue new JWT with updated farmId
  const token = await signToken({
    userId: user.id,
    role: user.role,
    tenantId,
    farmId,
  })

  const res = NextResponse.json({
    farmId: userFarm.farm.id,
    farmName: userFarm.farm.name,
    farmNameAr: userFarm.farm.nameAr,
  })

  res.cookies.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_MAX_AGE,
  })

  return res
}
