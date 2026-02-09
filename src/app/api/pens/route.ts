import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const pens = await prisma.pen.findMany({
      include: {
        _count: {
          select: { goats: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    })
    return NextResponse.json(pens)
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching pens' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, nameAr, capacity, type, notes } = body

    const pen = await prisma.pen.create({
      data: {
        name,
        nameAr,
        capacity: capacity ? Number(capacity) : null,
        type,
        notes
      }
    })

    return NextResponse.json(pen)
  } catch (error) {
    return NextResponse.json({ error: 'Error creating pen' }, { status: 500 })
  }
}
