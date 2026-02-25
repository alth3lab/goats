import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { logActivity } from '@/lib/activityLogger'

export const runtime = 'nodejs'

// GET /api/team - list team members for current farm
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const { user, tenantId, farmId } = auth

  const members = await prisma.userFarm.findMany({
    where: { farm: { tenantId }, farmId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
        }
      }
    }
  })

  const result = members.map(m => ({
    ...m.user,
    farmRole: m.role,
    userFarmId: m.id,
  }))

  return NextResponse.json(result)
}

// POST /api/team - invite/add member to current farm
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const { user, tenantId, farmId } = auth

  if (!['SUPER_ADMIN', 'OWNER', 'ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'غير مصرح بإضافة أعضاء' }, { status: 403 })
  }

  // Check tenant user limit
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) {
    return NextResponse.json({ error: 'المستأجر غير موجود' }, { status: 404 })
  }

  const userCount = await prisma.user.count({ where: { tenantId } })
  if (userCount >= tenant.maxUsers) {
    return NextResponse.json(
      { error: `تم الوصول للحد الأقصى من المستخدمين (${tenant.maxUsers}). قم بترقية الخطة.` },
      { status: 403 }
    )
  }

  const body = await request.json()
  const { fullName, username, email, password, phone, role } = body

  if (!fullName || !username || !email || !password) {
    return NextResponse.json({ error: 'جميع الحقول المطلوبة يجب تعبئتها' }, { status: 400 })
  }

  // Check uniqueness
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] }
  })
  if (existing) {
    return NextResponse.json({ error: 'البريد أو اسم المستخدم مستخدم بالفعل' }, { status: 409 })
  }

  const allowedRoles = ['ADMIN', 'MANAGER', 'VETERINARIAN', 'USER', 'VIEWER']
  const memberRole = allowedRoles.includes(role) ? role : 'USER'

  const hashedPassword = await bcrypt.hash(password, 12)

  const result = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        tenantId,
        username,
        email,
        password: hashedPassword,
        fullName,
        phone: phone || null,
        role: memberRole,
      }
    })

    await tx.userFarm.create({
      data: {
        userId: newUser.id,
        farmId,
        role: memberRole as any,
      }
    })

    return newUser
  })

  await logActivity({
    userId: user.id,
    tenantId,
    farmId,
    action: 'CREATE',
    entity: 'User',
    entityId: result.id,
    description: `إضافة عضو جديد: ${result.fullName} (${memberRole})`,
  })

  return NextResponse.json({
    id: result.id,
    fullName: result.fullName,
    username: result.username,
    email: result.email,
    role: result.role,
  }, { status: 201 })
}
