import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

// Get all breeds or filter by type
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const typeId = searchParams.get('typeId')
    
    const breeds = await prisma.breed.findMany({
      where: typeId ? { typeId } : undefined,
      include: {
        type: true
      },
      orderBy: { name: 'asc' }
    })
    
    return NextResponse.json(breeds)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب السلالات' }, { status: 500 })
  }
}

// Create new breed
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const breed = await prisma.breed.create({
      data: body,
      include: {
        type: true
      }
    })
    return NextResponse.json(breed, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة السلالة' }, { status: 500 })
  }
}
