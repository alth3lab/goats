import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'

// GET /api/admin/tenants — List all tenants (SUPER_ADMIN only)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response

    if (auth.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    const tenants = await prisma.tenant.findMany({
      include: {
        _count: { select: { users: true, farms: true } },
        farms: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            _count: { select: { goats: true, pens: true, userFarms: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const result = await Promise.all(
      tenants.map(async (t) => {
        const goatCount = await prisma.goat.count({
          where: { farm: { tenantId: t.id } },
        })
        return {
          id: t.id,
          name: t.name,
          nameAr: t.nameAr,
          email: t.email,
          phone: t.phone,
          plan: t.plan,
          maxFarms: t.maxFarms,
          maxGoats: t.maxGoats,
          maxUsers: t.maxUsers,
          isActive: t.isActive,
          createdAt: t.createdAt,
          usersCount: t._count.users,
          farmsCount: t._count.farms,
          goatsCount: goatCount,
          farms: t.farms.map((f) => ({
            id: f.id,
            name: f.nameAr || f.name,
            goats: f._count.goats,
            pens: f._count.pens,
            users: f._count.userFarms,
          })),
        }
      })
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Admin tenants error:', error)
    return NextResponse.json({ error: 'فشل في جلب البيانات' }, { status: 500 })
  }
}

// PUT /api/admin/tenants — Update a tenant (activate/deactivate/change plan)
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response

    if (auth.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    const body = await request.json()
    const { tenantId, isActive, plan, maxFarms, maxGoats, maxUsers } = body

    if (!tenantId) {
      return NextResponse.json({ error: 'معرف المستأجر مطلوب' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (typeof isActive === 'boolean') updateData.isActive = isActive
    if (plan) {
      updateData.plan = plan
      // Auto-update limits based on plan
      const planLimits: Record<string, { maxFarms: number; maxGoats: number; maxUsers: number }> = {
        FREE: { maxFarms: 1, maxGoats: 50, maxUsers: 2 },
        BASIC: { maxFarms: 3, maxGoats: 500, maxUsers: 5 },
        PRO: { maxFarms: 10, maxGoats: 5000, maxUsers: 20 },
        ENTERPRISE: { maxFarms: 999, maxGoats: 99999, maxUsers: 999 },
      }
      if (planLimits[plan]) {
        Object.assign(updateData, planLimits[plan])
      }
    }
    if (maxFarms !== undefined) updateData.maxFarms = maxFarms
    if (maxGoats !== undefined) updateData.maxGoats = maxGoats
    if (maxUsers !== undefined) updateData.maxUsers = maxUsers

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: updateData as any,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Admin update tenant error:', error)
    return NextResponse.json({ error: 'فشل في تحديث المستأجر' }, { status: 500 })
  }
}
