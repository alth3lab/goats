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

    // Current farm from JWT
    const currentFarmId = payload.farmId

    const currentFarm = user.userFarms.find(uf => uf.farmId === currentFarmId)?.farm

    // SUPER_ADMIN: resolve current farm from DB if not in userFarms, and list all farms grouped by tenant
    let farmsData
    let resolvedFarm = currentFarm
    if (user.role === 'SUPER_ADMIN') {
      // If SUPER_ADMIN switched to a farm they don't own via UserFarm, resolve it
      if (!resolvedFarm && currentFarmId) {
        resolvedFarm = await prisma.farm.findUnique({
          where: { id: currentFarmId },
          select: { id: true, name: true, nameAr: true, currency: true, farmType: true },
        }) as typeof currentFarm
      }

      const allFarms = await prisma.farm.findMany({
        include: { tenant: { select: { name: true, nameAr: true } } },
        orderBy: { createdAt: 'desc' },
      })
      farmsData = allFarms.map(f => ({
        id: f.id,
        name: f.name,
        nameAr: f.nameAr,
        farmType: f.farmType || 'SHEEP',
        role: 'SUPER_ADMIN',
        tenantName: f.tenant?.nameAr || f.tenant?.name || '',
        tenantId: f.tenantId,
      }))
    } else {
      farmsData = user.userFarms.map(uf => ({
        id: uf.farm.id,
        name: uf.farm.name,
        nameAr: uf.farm.nameAr,
        farmType: uf.farm.farmType || 'SHEEP',
        role: uf.role,
      }))
    }

    return NextResponse.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
        tenantId: payload.tenantId,
        farmId: currentFarmId,
      },
      farm: resolvedFarm ? {
        id: resolvedFarm.id,
        name: resolvedFarm.name,
        nameAr: resolvedFarm.nameAr,
        currency: resolvedFarm.currency,
        farmType: resolvedFarm.farmType || 'SHEEP',
      } : null,
      farms: farmsData,
      permissions
    })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب المستخدم' }, { status: 500 })
  }
}
