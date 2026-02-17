import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export const runtime = 'nodejs'

// GET /api/admin/tenants/[tenantId]/users — List all users for a tenant (SUPER_ADMIN only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response

    if (auth.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    const { tenantId } = await params

    // No runWithTenant → bypass middleware filtering
    // Exclude SUPER_ADMIN from tenant user lists
    const users = await prisma.user.findMany({
      where: { tenantId, role: { not: 'SUPER_ADMIN' } },
      include: {
        userFarms: {
          include: {
            farm: { select: { id: true, name: true, nameAr: true } },
          },
        },
        permissions: {
          include: { permission: { select: { name: true, nameAr: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, nameAr: true, maxUsers: true },
    })

    return NextResponse.json({
      tenant: tenant || { name: '', nameAr: '', maxUsers: 0 },
      users: users.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        username: u.username,
        email: u.email,
        phone: u.phone,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
        farms: u.userFarms.map((uf) => ({
          id: uf.farm.id,
          name: uf.farm.nameAr || uf.farm.name,
          role: uf.role,
        })),
        permissions: u.permissions.map((p) => p.permission.name),
      })),
    })
  } catch (error) {
    console.error('Admin users list error:', error)
    return NextResponse.json({ error: 'فشل في جلب المستخدمين' }, { status: 500 })
  }
}

// PUT /api/admin/tenants/[tenantId]/users — Update a user (SUPER_ADMIN only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response

    if (auth.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    const { tenantId } = await params
    const body = await request.json()
    const { userId, action, role, isActive, newPassword } = body

    if (!userId) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 })
    }

    // Verify user belongs to this tenant
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.tenantId !== tenantId) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })
    }

    switch (action) {
      case 'toggleActive': {
        const updated = await prisma.user.update({
          where: { id: userId },
          data: { isActive: !user.isActive },
        })
        return NextResponse.json({ message: updated.isActive ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم', isActive: updated.isActive })
      }

      case 'changeRole': {
        if (!role || !['OWNER', 'ADMIN', 'MANAGER', 'USER', 'VETERINARIAN', 'VIEWER'].includes(role)) {
          return NextResponse.json({ error: 'الدور غير صالح' }, { status: 400 })
        }
        await prisma.user.update({ where: { id: userId }, data: { role } })
        return NextResponse.json({ message: `تم تغيير الدور إلى ${role}` })
      }

      case 'resetPassword': {
        if (!newPassword || newPassword.length < 6) {
          return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 })
        }
        const hashed = await bcrypt.hash(newPassword, 12)
        await prisma.user.update({ where: { id: userId }, data: { password: hashed } })
        return NextResponse.json({ message: 'تم إعادة تعيين كلمة المرور' })
      }

      case 'delete': {
        // Remove user from all farms first
        await prisma.userFarm.deleteMany({ where: { userId } })
        await prisma.userPermission.deleteMany({ where: { userId } })
        await prisma.user.delete({ where: { id: userId } })
        return NextResponse.json({ message: 'تم حذف المستخدم' })
      }

      default:
        return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 })
    }
  } catch (error) {
    console.error('Admin user action error:', error)
    return NextResponse.json({ error: 'فشل في تنفيذ الإجراء' }, { status: 500 })
  }
}
