import { NextRequest, NextResponse } from 'next/server'
// import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// TODO: MilkProduction model not found in schema.prisma
// This API is temporarily disabled until the model is created

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response

    return NextResponse.json({ error: 'MilkProduction API is not yet implemented' }, { status: 501 })
    
    /* DISABLED - MilkProduction model missing
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
    */
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب سجلات الحليب' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response

    return NextResponse.json({ error: 'MilkProduction API is not yet implemented' }, { status: 501 })

    /* DISABLED - MilkProduction model missing
    const body = await request.json()
    const record = await prisma.milkProduction.create({
      data: body,
      include: { goat: true }
    })
    return NextResponse.json(record, { status: 201 })
    */
  } catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة سجل الحليب' }, { status: 500 })
  }
}
