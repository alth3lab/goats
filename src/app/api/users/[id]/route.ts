import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'
import bcrypt from 'bcryptjs'

export const runtime = 'nodejs'

// GET /api/users/[id] - get single user with farm assignments
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission(request, 'view_users')
    if (auth.response) return auth.response

    const { id } = await params
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        userFarms: {
          include: {
            farm: { select: { id: true, name: true, nameAr: true, isActive: true } }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })
    }

    const { password, ...safeUser } = user
    return NextResponse.json(safeUser)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب بيانات المستخدم' }, { status: 500 })
  }
}

// PUT /api/users/[id] - update user (SUPER_ADMIN/OWNER/ADMIN)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission(request, 'add_user')
    if (auth.response) return auth.response

    const { id } = await params
    const body = await request.json()
    const { fullName, email, phone, role, isActive, password, farmIds } = body

    // Check user exists
    const existingUser = await prisma.user.findUnique({ where: { id } })
    if (!existingUser) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })
    }

    // Prevent editing SUPER_ADMIN unless you are SUPER_ADMIN
    if (existingUser.role === 'SUPER_ADMIN' && auth.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'لا يمكن تعديل مدير النظام' }, { status: 403 })
    }

    // Build update data
    const updateData: any = {}
    if (fullName !== undefined) updateData.fullName = fullName
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (role !== undefined) updateData.role = role
    if (isActive !== undefined) updateData.isActive = isActive
    if (password) {
      updateData.password = await bcrypt.hash(password, 12)
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData
    })

    // Update farm assignments if provided
    if (Array.isArray(farmIds)) {
      // Get current farm assignments
      const currentFarms = await prisma.userFarm.findMany({
        where: { userId: id },
        select: { farmId: true }
      })
      const currentFarmIds = currentFarms.map(f => f.farmId)

      // Farms to add
      const toAdd = farmIds.filter((fid: string) => !currentFarmIds.includes(fid))
      // Farms to remove
      const toRemove = currentFarmIds.filter(fid => !farmIds.includes(fid))

      if (toRemove.length > 0) {
        await prisma.userFarm.deleteMany({
          where: { userId: id, farmId: { in: toRemove } }
        })
      }

      if (toAdd.length > 0) {
        await prisma.userFarm.createMany({
          data: toAdd.map((farmId: string) => ({
            userId: id,
            farmId,
            role: updatedUser.role as any
          }))
        })
      }
    }

    const currentUserId = await getUserIdFromRequest(request)
    await logActivity({
      userId: currentUserId || undefined,
      action: 'UPDATE',
      entity: 'User',
      entityId: id,
      description: `تم تعديل المستخدم: ${updatedUser.fullName}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    const { password: _, ...safeUser } = updatedUser
    return NextResponse.json(safeUser)
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'البريد الإلكتروني مستخدم بالفعل' }, { status: 400 })
    }
    return NextResponse.json({ error: 'فشل في تعديل المستخدم' }, { status: 500 })
  }
}

// DELETE /api/users/[id] - deactivate user
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission(request, 'add_user')
    if (auth.response) return auth.response

    const { id } = await params

    const existingUser = await prisma.user.findUnique({ where: { id } })
    if (!existingUser) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })
    }

    if (existingUser.role === 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'لا يمكن حذف مدير النظام' }, { status: 403 })
    }

    // Soft delete - deactivate
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    })

    const currentUserId = await getUserIdFromRequest(request)
    await logActivity({
      userId: currentUserId || undefined,
      action: 'DELETE',
      entity: 'User',
      entityId: id,
      description: `تم تعطيل المستخدم: ${existingUser.fullName}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json({ message: 'تم تعطيل المستخدم بنجاح' })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في حذف المستخدم' }, { status: 500 })
  }
}
