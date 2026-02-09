import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const { id } = await params
    const body = await request.json()
    const { name, nameAr, capacity, type, notes } = body

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
    const { id } = await params
    
    // Check if pen has goats
    const count = await prisma.goat.count({
        where: { penId: id }
    })

    if (count > 0) {
        return NextResponse.json({ error: 'لا يمكن حذف الحظيرة لوجود حيوانات فيها' }, { status: 400 })
    }

    await prisma.pen.delete({
      where: { id }
    })
    return NextResponse.json({ message: 'تم الحذف بنجاح' })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في حذف الحظيرة' }, { status: 500 })
  }
}
