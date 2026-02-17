import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, TOKEN_COOKIE } from '@/lib/jwt'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(TOKEN_COOKIE)?.value
    if (!token) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        permissions: { include: { permission: true } },
        userFarms: { include: { farm: true } }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const permissions = user.permissions.map((entry) => entry.permission.name)

    // Current farm from JWT (or override)
    const farmIdOverride = request.headers.get('x-farm-id')
    const currentFarmId = farmIdOverride || payload.farmId

    const currentFarm = user.userFarms.find(uf => uf.farmId === currentFarmId)?.farm

    return NextResponse.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
        tenantId: payload.tenantId,
        farmId: currentFarmId,
      },
      farm: currentFarm ? {
        id: currentFarm.id,
        name: currentFarm.name,
        nameAr: currentFarm.nameAr,
        currency: currentFarm.currency,
      } : null,
      farms: user.userFarms.map(uf => ({
        id: uf.farm.id,
        name: uf.farm.name,
        nameAr: uf.farm.nameAr,
        role: uf.role,
      })),
      permissions
    })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب المستخدم' }, { status: 500 })
  }
}
