import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const { id } = await params
    const body = await request.json()
    const record = await prisma.breeding.update({
      where: { id },
      data: body
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
    const { id } = await params
    await prisma.breeding.delete({
      where: { id }
    })
    return NextResponse.json({ message: 'تم الحذف بنجاح' })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في حذف السجل' }, { status: 500 })
  }
}
