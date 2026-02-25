import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, getUserIdFromRequest } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'
import { logActivity } from '@/lib/activityLogger'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_feeds')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')

    const where: any = {}
    if (category && category !== 'ALL') {
      where.category = category
    }

    const feedTypes = await prisma.feedType.findMany({
      where,
      include: {
        stock: {
          orderBy: { purchaseDate: 'desc' }
        },
        schedules: {
          where: { isActive: true },
          include: { pen: true }
        }
      },
      orderBy: { nameAr: 'asc' }
    })

    return NextResponse.json(feedTypes)
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في جلب الأعلاف' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'add_feed')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const body = await request.json()
    const userId = await getUserIdFromRequest(request)

    // Input validation
    if (!body.nameAr || body.nameAr.trim().length === 0) {
      return NextResponse.json({ error: 'اسم العلف بالعربية مطلوب' }, { status: 400 })
    }
    if (!body.category) {
      return NextResponse.json({ error: 'فئة العلف مطلوبة' }, { status: 400 })
    }

    // Category normalization (BUG-05)
    const categoryMap: Record<string, string> = { GRAIN: 'GRAINS', SUPPLEMENT: 'SUPPLEMENTS' }
    const normalizedCategory = categoryMap[body.category] || body.category
    
    // Convert field names from frontend to database schema
    const createData: any = {
      name: body.nameEn || body.nameAr, // Use nameEn as name field
      nameAr: body.nameAr.trim(),
      category: normalizedCategory,
      protein: body.protein ? parseFloat(body.protein) : null,
      energy: body.energy ? parseFloat(body.energy) : null,
      unitPrice: body.unitPrice ? parseFloat(body.unitPrice) : null,
      reorderLevel: body.reorderLevel ? parseFloat(body.reorderLevel) : 50,
      supplier: body.supplier || null,
      notes: body.description || body.notes || null
    }

    const feedType = await prisma.feedType.create({
      data: createData
    })

    // Activity logging (CODE-02)
    await logActivity({
      userId: userId || undefined,
      action: 'CREATE',
      entity: 'FeedType',
      entityId: feedType.id,
      description: `إضافة نوع علف: ${feedType.nameAr}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json(feedType, { status: 201 })
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة نوع العلف' }, { status: 500 })
  }
}
