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

  let targetFarm: { id: string; name: string; nameAr: string | null; tenantId: string } | null = null

  if (user.role === 'SUPER_ADMIN') {
    // SUPER_ADMIN can switch to ANY farm across all tenants
    targetFarm = await prisma.farm.findUnique({
      where: { id: farmId },
      select: { id: true, name: true, nameAr: true, tenantId: true },
    })
  } else {
    // Regular users - verify access via UserFarm
    const userFarm = await prisma.userFarm.findUnique({
      where: { userId_farmId: { userId: user.id, farmId } },
      include: { farm: { select: { id: true, name: true, nameAr: true, tenantId: true } } }
    })
    targetFarm = userFarm?.farm || null
  }

  if (!targetFarm) {
    return NextResponse.json({ error: 'ليس لديك صلاحية الوصول لهذه المزرعة' }, { status: 403 })
  }

  // Issue new JWT with updated farmId and the target farm's tenantId
  const token = await signToken({
    userId: user.id,
    role: user.role,
    tenantId: targetFarm.tenantId,
    farmId: targetFarm.id,
  })

  const res = NextResponse.json({
    farmId: targetFarm.id,
    farmName: targetFarm.name,
    farmNameAr: targetFarm.nameAr,
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
