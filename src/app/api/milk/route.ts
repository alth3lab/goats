import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const goatId = searchParams.get('goatId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    const records = await prisma.milkProduction.findMany({
      where: {
        ...(goatId && { goatId }),
        ...(startDate && endDate && {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        })
      },
      include: { goat: true },
      orderBy: { date: 'desc' }
    })
    
    return NextResponse.json(records)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب سجلات الحليب' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const record = await prisma.milkProduction.create({
      data: body,
      include: { goat: true }
    })
    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة سجل الحليب' }, { status: 500 })
  }
}
