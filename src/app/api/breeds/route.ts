import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'

export const runtime = 'nodejs'

// Get all breeds or filter by type
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_types')
    if (auth.response) return auth.response

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
    const auth = await requirePermission(request, 'add_breed')
    if (auth.response) return auth.response

    const body = await request.json()
    const userId = getUserIdFromRequest(request)
    const breed = await prisma.breed.create({
      data: body,
      include: {
        type: true
      }
    })
    await logActivity({
      userId: userId || undefined,
      action: 'CREATE',
      entity: 'Breed',
      entityId: breed.id,
      description: `تم إضافة السلالة: ${breed.nameAr}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })
    return NextResponse.json(breed, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة السلالة' }, { status: 500 })
  }
}
