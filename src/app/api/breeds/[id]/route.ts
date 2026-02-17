import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission(request, 'edit_breed')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const { id } = await params
    const body = await request.json()
    const userId = await getUserIdFromRequest(request)
    const breed = await prisma.breed.update({
      where: { id },
      data: body,
      include: { type: true }
    })
    await logActivity({
      userId: userId || undefined,
      action: 'UPDATE',
      entity: 'Breed',
      entityId: breed.id,
      description: `تم تعديل السلالة: ${breed.nameAr}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })
    return NextResponse.json(breed)
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في تعديل السلالة' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission(request, 'delete_breed')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const { id } = await params
    const userId = await getUserIdFromRequest(request)
    const breed = await prisma.breed.delete({ where: { id } })
    await logActivity({
      userId: userId || undefined,
      action: 'DELETE',
      entity: 'Breed',
      entityId: breed.id,
      description: `تم حذف السلالة: ${breed.nameAr}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })
    return NextResponse.json({ success: true })
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في حذف السلالة' }, { status: 500 })
  }
}
