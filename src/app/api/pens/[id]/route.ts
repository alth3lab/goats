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
    const auth = await requirePermission(request, 'view_pens')
    if (auth.response) return auth.response

    const { id } = await params
    const pen = await prisma.pen.findUnique({
      where: { id },
      include: {
        goats: {
          include: {
            breed: {
                include: { type: true }
            }
          },
          orderBy: { tagId: 'asc' }
        },
        _count: {
          select: { goats: true }
        }
      }
    })

    if (!pen) {
      return NextResponse.json({ error: 'الحظيرة غير موجودة' }, { status: 404 })
    }

    return NextResponse.json(pen)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب بيانات الحظيرة' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'edit_pen')
    if (auth.response) return auth.response

    const { id } = await params
    const body = await request.json()
    const { name, nameAr, capacity, type, notes } = body
    const userId = getUserIdFromRequest(request)

    const pen = await prisma.pen.update({
      where: { id },
      data: {
        name,
        nameAr,
        capacity: capacity ? Number(capacity) : null,
        type,
        notes
      }
    })

    await logActivity({
      userId: userId || undefined,
      action: 'UPDATE',
      entity: 'Pen',
      entityId: pen.id,
      description: `تم تعديل الحظيرة: ${pen.nameAr}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json(pen)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في تحديث الحظيرة' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'delete_pen')
    if (auth.response) return auth.response

    const { id } = await params
    const userId = getUserIdFromRequest(request)
    
    // Check if pen has goats
    const count = await prisma.goat.count({
        where: { penId: id }
    })

    if (count > 0) {
        return NextResponse.json({ error: 'لا يمكن حذف الحظيرة لوجود حيوانات فيها' }, { status: 400 })
    }

    const pen = await prisma.pen.delete({
      where: { id }
    })
    await logActivity({
      userId: userId || undefined,
      action: 'DELETE',
      entity: 'Pen',
      entityId: pen.id,
      description: `تم حذف الحظيرة: ${pen.nameAr}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })
    return NextResponse.json({ message: 'تم الحذف بنجاح' })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في حذف الحظيرة' }, { status: 500 })
  }
}
