import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'
import { createUserSchema, validateBody } from '@/lib/validators/schemas'
import bcrypt from 'bcryptjs'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_users')
    if (auth.response) return auth.response

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(users)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب المستخدمين' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'add_user')
    if (auth.response) return auth.response

    const body = await request.json()
    const validation = validateBody(createUserSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const userId = await getUserIdFromRequest(request)
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(validation.data.password, 12)
    const user = await prisma.user.create({
      data: { ...validation.data, password: hashedPassword }
    })
    await logActivity({
      userId: userId || undefined,
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      description: `تم إنشاء المستخدم: ${user.fullName}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })
    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة المستخدم' }, { status: 500 })
  }
}
