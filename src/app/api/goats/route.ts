import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateGoatAge, formatAge } from '@/lib/ageCalculator'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    
    const goats = await prisma.goat.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        breed: {
          include: {
            type: true
          }
        },
        pen: true,
        healthRecords: {
          take: 5,
          orderBy: { date: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    // إضافة معلومات العمر لكل ماعز
    const goatsWithAge = goats.map(goat => {
      const age = calculateGoatAge(goat.birthDate)
      return {
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
    })
    
    return NextResponse.json(goatsWithAge)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب البيانات' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const goat = await prisma.goat.create({
      data: body
    })
    return NextResponse.json(goat, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة الماعز' }, { status: 500 })
  }
}
