import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'

export const runtime = 'nodejs'

// GET /api/farms/[id]/members - list farm members
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission(request, 'view_users')
    if (auth.response) return auth.response

    const { id: farmId } = await params

    const members = await prisma.userFarm.findMany({
      where: { farmId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            role: true,
            isActive: true
          }
        }
      }
    })

    return NextResponse.json(members.map(m => ({
      id: m.id,
      userId: m.userId,
      farmId: m.farmId,
      role: m.role,
      fullName: m.user.fullName,
      username: m.user.username,
      email: m.user.email,
      userRole: m.user.role,
      isActive: m.user.isActive
    })))
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب أعضاء المزرعة' }, { status: 500 })
  }
}

// POST /api/farms/[id]/members - add user to farm
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission(request, 'add_user')
    if (auth.response) return auth.response

    const { id: farmId } = await params
    const body = await request.json()
    const { userId, role } = body

    if (!userId) {
      return NextResponse.json({ error: 'معرّف المستخدم مطلوب' }, { status: 400 })
    }

    // Check farm exists
    const farm = await prisma.farm.findUnique({ where: { id: farmId } })
    if (!farm) {
      return NextResponse.json({ error: 'المزرعة غير موجودة' }, { status: 404 })
    }

    // Check user exists
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })
    }

    // Check if already a member
    const existing = await prisma.userFarm.findUnique({
      where: { userId_farmId: { userId, farmId } }
    })
    if (existing) {
      return NextResponse.json({ error: 'المستخدم عضو بالفعل في هذه المزرعة' }, { status: 400 })
    }

    const member = await prisma.userFarm.create({
      data: {
        userId,
        farmId,
        role: role || user.role
      }
    })

    const currentUserId = await getUserIdFromRequest(request)
    await logActivity({
      userId: currentUserId || undefined,
      farmId,
      action: 'CREATE',
      entity: 'UserFarm',
      entityId: member.id,
      description: `تمت إضافة ${user.fullName} إلى المزرعة ${farm.nameAr || farm.name}`,
    })

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة العضو' }, { status: 500 })
  }
}

// DELETE /api/farms/[id]/members - remove user from farm
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission(request, 'add_user')
    if (auth.response) return auth.response

    const { id: farmId } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'معرّف المستخدم مطلوب' }, { status: 400 })
    }

    const existing = await prisma.userFarm.findUnique({
      where: { userId_farmId: { userId, farmId } }
    })
    if (!existing) {
      return NextResponse.json({ error: 'المستخدم ليس عضواً في هذه المزرعة' }, { status: 404 })
    }

    await prisma.userFarm.delete({
      where: { userId_farmId: { userId, farmId } }
    })

    const currentUserId = await getUserIdFromRequest(request)
    await logActivity({
      userId: currentUserId || undefined,
      farmId,
      action: 'DELETE',
      entity: 'UserFarm',
      entityId: existing.id,
      description: `تمت إزالة المستخدم من المزرعة`,
    })

    return NextResponse.json({ message: 'تمت إزالة المستخدم من المزرعة' })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في إزالة العضو' }, { status: 500 })
  }
}
