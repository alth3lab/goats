import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const goatId = searchParams.get('goatId')
    
    const records = await prisma.healthRecord.findMany({
      where: goatId ? { goatId } : undefined,
      include: { goat: true },
      orderBy: { date: 'desc' }
    })
    
    return NextResponse.json(records)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب السجلات الصحية' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const record = await prisma.healthRecord.create({
      data: body,
      include: { goat: true }
    })
    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة السجل الصحي' }, { status: 500 })
  }
}
