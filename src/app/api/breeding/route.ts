import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const records = await prisma.breeding.findMany({
      include: {
        mother: true,
        father: true,
        births: true
      },
      orderBy: { matingDate: 'desc' }
    })
    
    return NextResponse.json(records)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب سجلات التكاثر' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const record = await prisma.breeding.create({
      data: body,
      include: {
        mother: true,
        father: true
      }
    })
    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة سجل التكاثر' }, { status: 500 })
  }
}
