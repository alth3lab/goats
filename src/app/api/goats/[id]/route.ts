import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateGoatAge, formatAge } from '@/lib/ageCalculator'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const goat = await prisma.goat.findUnique({
      where: { id },
      include: {
        breed: {
          include: {
            type: true
          }
        },
        pen: true,
        healthRecords: { orderBy: { date: 'desc' } },
        breedingAsMother: { include: { father: true, births: true } },
        breedingAsFather: { include: { mother: true, births: true } },
        feedingRecords: { orderBy: { date: 'desc' }, take: 30 },
        sales: true
      }
    })
    
    if (!goat) {
      return NextResponse.json({ error: 'الماعز غير موجود' }, { status: 404 })
    }
    
    // إضافة معلومات العمر
    const age = calculateGoatAge(goat.birthDate)
    const goatWithAge = {
      ...goat,
      age: {
        years: age.years,
        months: age.months,
        days: age.days,
        totalMonths: age.totalMonths,
        category: age.categoryAr,
        formatted: formatAge(age)
      }
    }
    
    return NextResponse.json(goatWithAge)
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
    const goat = await prisma.goat.update({
      where: { id },
      data: body
    })
    return NextResponse.json(goat)
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
    await prisma.goat.delete({
      where: { id }
    })
    return NextResponse.json({ message: 'تم الحذف بنجاح' })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في حذف الماعز' }, { status: 500 })
  }
}
