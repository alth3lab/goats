import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { logActivity } from '@/lib/activityLogger'
import bcrypt from 'bcryptjs'

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

    await logActivity({
      userId: auth.user.id,
      tenantId: tenantId,
      action: 'UPDATE',
      entity: 'Tenant',
      entityId: tenantId,
      description: `تعديل إعدادات المستأجر: ${JSON.stringify(updateData)}`,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Admin update tenant error:', error)
    return NextResponse.json({ error: 'فشل في تحديث المستأجر' }, { status: 500 })
  }
}

// POST /api/admin/tenants — Create a new tenant with an owner user
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response

    if (auth.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    const body = await request.json()
    const { name, nameAr, email, phone, plan, ownerUsername, ownerPassword, ownerFullName, ownerEmail } = body

    if (!name || !email || !ownerUsername || !ownerPassword || !ownerFullName || !ownerEmail) {
      return NextResponse.json({ error: 'جميع الحقول المطلوبة يجب تعبئتها' }, { status: 400 })
    }

    // Check unique email
    const existingTenant = await prisma.tenant.findUnique({ where: { email } })
    if (existingTenant) {
      return NextResponse.json({ error: 'البريد الإلكتروني مستخدم بالفعل' }, { status: 400 })
    }
    const existingUser = await prisma.user.findUnique({ where: { username: ownerUsername } })
    if (existingUser) {
      return NextResponse.json({ error: 'اسم المستخدم مستخدم بالفعل' }, { status: 400 })
    }

    const planLimits: Record<string, { maxFarms: number; maxGoats: number; maxUsers: number }> = {
      FREE: { maxFarms: 1, maxGoats: 50, maxUsers: 2 },
      BASIC: { maxFarms: 3, maxGoats: 500, maxUsers: 5 },
      PRO: { maxFarms: 10, maxGoats: 5000, maxUsers: 20 },
      ENTERPRISE: { maxFarms: 999, maxGoats: 99999, maxUsers: 999 },
    }
    const limits = planLimits[plan || 'FREE'] || planLimits.FREE

    const hashedPassword = await bcrypt.hash(ownerPassword, 10)

    const tenant = await prisma.tenant.create({
      data: {
        name,
        nameAr: nameAr || null,
        email,
        phone: phone || null,
        plan: plan || 'FREE',
        ...limits,
      },
    })

    // Create owner user
    await prisma.user.create({
      data: {
        username: ownerUsername,
        email: ownerEmail,
        fullName: ownerFullName,
        password: hashedPassword,
        role: 'OWNER',
        tenantId: tenant.id,
        isActive: true,
      },
    })

    await logActivity({
      userId: auth.user.id,
      tenantId: tenant.id,
      action: 'CREATE',
      entity: 'Tenant',
      entityId: tenant.id,
      description: `إنشاء مستأجر جديد: ${name} (${email})`,
    })

    return NextResponse.json(tenant, { status: 201 })
  } catch (error) {
    console.error('Admin create tenant error:', error)
    return NextResponse.json({ error: 'فشل في إنشاء المستأجر' }, { status: 500 })
  }
}

// DELETE /api/admin/tenants — Delete a tenant and all related data
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response

    if (auth.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'معرف المستأجر مطلوب' }, { status: 400 })
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) {
      return NextResponse.json({ error: 'المستأجر غير موجود' }, { status: 404 })
    }

    // Cascade delete handled by schema (onDelete: Cascade on Farm)
    // But we need to handle users separately since they may not cascade
    await prisma.user.deleteMany({ where: { tenantId } })
    await prisma.tenant.delete({ where: { id: tenantId } })

    await logActivity({
      userId: auth.user.id,
      action: 'DELETE',
      entity: 'Tenant',
      entityId: tenantId,
      description: `حذف المستأجر: ${tenant.name} (${tenant.email})`,
    })

    return NextResponse.json({ message: 'تم حذف المستأجر بنجاح' })
  } catch (error) {
    console.error('Admin delete tenant error:', error)
    return NextResponse.json({ error: 'فشل في حذف المستأجر' }, { status: 500 })
  }
}
