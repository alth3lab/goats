import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const sales = await prisma.sale.findMany({
      include: { goat: true },
      orderBy: { date: 'desc' }
    })
    return NextResponse.json(sales)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب المبيعات' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const sale = await prisma.sale.create({
      data: body,
      include: { goat: true }
    })
    return NextResponse.json(sale, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة البيع' }, { status: 500 })
  }
}
