import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission(_request, 'manage_permissions')
    if (auth.response) return auth.response

    const { id } = await params
    const permissions = await prisma.userPermission.findMany({
      where: { userId: id },
      include: { permission: true }
    })
    return NextResponse.json(permissions)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب صلاحيات المستخدم' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission(request, 'manage_permissions')
    if (auth.response) return auth.response

    const { id } = await params
    const body = await request.json()
    const userId = await getUserIdFromRequest(request)
    const permissionIds: string[] = Array.isArray(body.permissionIds) ? body.permissionIds : []

    await prisma.$transaction([
      prisma.userPermission.deleteMany({ where: { userId: id } }),
      prisma.userPermission.createMany({
        data: permissionIds.map((permissionId) => ({
          userId: id,
          permissionId
        }))
      })
    ])

    await logActivity({
      userId: userId || undefined,
      action: 'UPDATE',
      entity: 'UserPermission',
      entityId: id,
      description: `تم تحديث صلاحيات المستخدم (${id})`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في حفظ صلاحيات المستخدم' }, { status: 500 })
  }
}
