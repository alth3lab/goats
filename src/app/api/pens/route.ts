import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const pens = await prisma.pen.findMany({
      include: {
        _count: {
          select: { goats: true }
        },
        goats: {
          select: {
            gender: true
          }
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
    let { name, nameAr, capacity, type, notes } = body

    // Ensure we have a unique name if not provided
    if (!name || name.trim() === '') {
      name = `PEN-${Date.now()}`
    }

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
  } catch (error: any) {
    console.error('Error creating pen:', error)
    // Check for unique constraint violation (P2002)
    if (error.code === 'P2002') {
        return NextResponse.json({ error: 'اسم الحظيرة (الإنجليزي) مستخدم بالفعل' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error creating pen' }, { status: 500 })
  }
}
