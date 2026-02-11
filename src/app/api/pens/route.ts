import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_pens')
    if (auth.response) return auth.response

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
    
    // إضافة currentCount المحسوب
    const pensWithCount = pens.map(pen => ({
      ...pen,
      currentCount: pen._count.goats
    }))
    
    return NextResponse.json(pensWithCount)
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching pens' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'add_pen')
    if (auth.response) return auth.response

    const body = await request.json()
    const userId = getUserIdFromRequest(request)
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

    await logActivity({
      userId: userId || undefined,
      action: 'CREATE',
      entity: 'Pen',
      entityId: pen.id,
      description: `تم إنشاء الحظيرة: ${pen.nameAr}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
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
