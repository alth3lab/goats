import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission(request, 'edit_type')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const { id } = await params
    const body = await request.json()
    const userId = await getUserIdFromRequest(request)
    const type = await prisma.goatType.update({
      where: { id },
      data: body
    })
    await logActivity({
      userId: userId || undefined,
      action: 'UPDATE',
      entity: 'GoatType',
      entityId: type.id,
      description: `تم تعديل النوع: ${type.nameAr}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })
    return NextResponse.json(type)
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في تعديل النوع' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission(request, 'delete_type')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const { id } = await params
    const userId = await getUserIdFromRequest(request)
    const type = await prisma.goatType.delete({ where: { id } })
    await logActivity({
      userId: userId || undefined,
      action: 'DELETE',
      entity: 'GoatType',
      entityId: type.id,
      description: `تم حذف النوع: ${type.nameAr}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })
    return NextResponse.json({ success: true })
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في حذف النوع' }, { status: 500 })
  }
}
