import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'view_breeding')
    if (auth.response) return auth.response

    const { id } = await params
    const record = await prisma.breeding.findUnique({
      where: { id },
      include: {
        mother: true,
        father: true,
        births: true
      }
    })
    
    if (!record) {
      return NextResponse.json({ error: 'السجل غير موجود' }, { status: 404 })
    }
    
    return NextResponse.json(record)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب البيانات' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'edit_breeding')
    if (auth.response) return auth.response

    const { id } = await params
    const body = await request.json()
    const userId = getUserIdFromRequest(request)
    const record = await prisma.breeding.update({
      where: { id },
      data: body
    })
    await logActivity({
      userId: userId || undefined,
      action: 'UPDATE',
      entity: 'Breeding',
      entityId: record.id,
      description: 'تم تعديل سجل التكاثر',
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })
    return NextResponse.json(record)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في تحديث البيانات' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'delete_breeding')
    if (auth.response) return auth.response

    const { id } = await params
    const userId = getUserIdFromRequest(request)
    const record = await prisma.breeding.delete({
      where: { id }
    })
    await logActivity({
      userId: userId || undefined,
      action: 'DELETE',
      entity: 'Breeding',
      entityId: record.id,
      description: 'تم حذف سجل التكاثر',
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })
    return NextResponse.json({ message: 'تم الحذف بنجاح' })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في حذف السجل' }, { status: 500 })
  }
}
