import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value
    if (!userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        permissions: { include: { permission: true } }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const permissions = user.permissions.map((entry) => entry.permission.name)

    return NextResponse.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        role: user.role
      },
      permissions
    })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب المستخدم' }, { status: 500 })
  }
}
