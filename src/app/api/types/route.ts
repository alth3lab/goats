import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'

export const runtime = 'nodejs'

// Get all goat types
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_types')
    if (auth.response) return auth.response

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
    const auth = await requirePermission(request, 'add_type')
    if (auth.response) return auth.response

    const body = await request.json()
    const userId = getUserIdFromRequest(request)
    const type = await prisma.goatType.create({
      data: body
    })
    await logActivity({
      userId: userId || undefined,
      action: 'CREATE',
      entity: 'GoatType',
      entityId: type.id,
      description: `تم إضافة النوع: ${type.nameAr}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })
    return NextResponse.json(type, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة النوع' }, { status: 500 })
  }
}
