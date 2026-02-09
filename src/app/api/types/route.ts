import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

// Get all goat types
export async function GET() {
  try {
    const types = await prisma.goatType.findMany({
      include: {
        breeds: {
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    })
    
    return NextResponse.json(types)
  } catch (error) {
    return NextResponse.json(
      {
        error: 'فشل في جلب الأنواع',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}

// Create new goat type
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const type = await prisma.goatType.create({
      data: body
    })
    return NextResponse.json(type, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة النوع' }, { status: 500 })
  }
}
