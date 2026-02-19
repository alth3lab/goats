import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { logActivity } from '@/lib/activityLogger'

export const runtime = 'nodejs'

// GET /api/farms - list user's farms (SUPER_ADMIN sees ALL farms)
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const { user, tenantId } = auth

  // SUPER_ADMIN: show ALL farms across ALL tenants
  if (user.role === 'SUPER_ADMIN') {
    const allFarms = await prisma.farm.findMany({
      include: {
        tenant: { select: { name: true, nameAr: true } },
        _count: { select: { goats: true, pens: true, userFarms: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const farms = allFarms.map(f => ({
      id: f.id,
      name: f.name,
      nameAr: f.nameAr,
      farmType: f.farmType || 'GOAT',
      phone: f.phone,
      address: f.address,
      currency: f.currency,
      isActive: f.isActive,
      role: 'SUPER_ADMIN',
      tenantName: f.tenant?.nameAr || f.tenant?.name || '',
      goatsCount: f._count.goats,
      pensCount: f._count.pens,
      usersCount: f._count.userFarms,
      createdAt: f.createdAt,
    }))

    return NextResponse.json(farms)
  }

  const userFarms = await prisma.userFarm.findMany({
    where: { userId: user.id },
    include: {
      farm: {
        include: {
          _count: {
            select: { goats: true, pens: true, userFarms: true }
          }
        }
      }
    }
  })

  const farms = userFarms.map(uf => ({
    id: uf.farm.id,
    name: uf.farm.name,
    nameAr: uf.farm.nameAr,
    farmType: uf.farm.farmType || 'GOAT',
    phone: uf.farm.phone,
    address: uf.farm.address,
    currency: uf.farm.currency,
    isActive: uf.farm.isActive,
    role: uf.role,
    goatsCount: uf.farm._count.goats,
    pensCount: uf.farm._count.pens,
    usersCount: uf.farm._count.userFarms,
    createdAt: uf.farm.createdAt,
  }))

  return NextResponse.json(farms)
}

// POST /api/farms - create new farm
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const { user, tenantId } = auth

  if (!['SUPER_ADMIN', 'OWNER', 'ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'غير مصرح بإنشاء مزرعة' }, { status: 403 })
  }

  // Check tenant farm limit
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) {
    return NextResponse.json({ error: 'المستأجر غير موجود' }, { status: 404 })
  }

  const farmCount = await prisma.farm.count({ where: { tenantId } })
  if (farmCount >= tenant.maxFarms) {
    return NextResponse.json(
      { error: `تم الوصول للحد الأقصى من المزارع (${tenant.maxFarms}). قم بترقية الخطة.` },
      { status: 403 }
    )
  }

  const body = await request.json()
  const { name, nameAr, phone, address, currency, farmType } = body

  if (!name) {
    return NextResponse.json({ error: 'اسم المزرعة مطلوب' }, { status: 400 })
  }

  const validFarmTypes = ['GOAT', 'SHEEP', 'CAMEL', 'MIXED']
  const resolvedFarmType = validFarmTypes.includes(farmType) ? farmType : 'GOAT'

  const farm = await prisma.farm.create({
    data: {
      tenantId,
      name,
      nameAr: nameAr || name,
      farmType: resolvedFarmType,
      phone: phone || null,
      address: address || null,
      currency: currency || 'AED',
    }
  })

  // Link creator to farm
  await prisma.userFarm.create({
    data: {
      userId: user.id,
      farmId: farm.id,
      role: user.role as any,
    }
  })

  await logActivity({
    userId: user.id,
    tenantId,
    farmId: farm.id,
    action: 'CREATE',
    entity: 'Farm',
    entityId: farm.id,
    description: `إنشاء مزرعة جديدة: ${farm.name}`,
  })

  return NextResponse.json(farm, { status: 201 })
}
