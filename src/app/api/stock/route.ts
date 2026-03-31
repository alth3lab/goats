import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, getUserIdFromRequest } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'
import { logActivity } from '@/lib/activityLogger'

export const runtime = 'nodejs'

const VALID_STOCK_TYPES = ['FEED', 'MEDICINE', 'VACCINE', 'EQUIPMENT', 'SUPPLY']

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_inventory')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {
      const searchParams = request.nextUrl.searchParams
      const type = searchParams.get('type')        // FEED | MEDICINE | VACCINE | EQUIPMENT | SUPPLY
      const lowStock = searchParams.get('lowStock') === 'true'
      const inactive = searchParams.get('inactive') === 'true'

      const where: any = {}
      if (type) where.type = type
      if (!inactive) where.isActive = true

      const items = await prisma.stockItem.findMany({
        where,
        include: {
          movements: {
            take: 5,
            orderBy: { date: 'desc' }
          }
        },
        orderBy: { nameAr: 'asc' }
      })

      const result = lowStock
        ? items.filter(i => i.minStock !== null && i.currentStock <= i.minStock)
        : items

      return NextResponse.json(result)
    })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب المواد' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'add_inventory')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {
      const body = await request.json()
      const userId = await getUserIdFromRequest(request)

      if (!body.nameAr?.trim()) {
        return NextResponse.json({ error: 'الاسم بالعربية مطلوب' }, { status: 400 })
      }
      if (!body.type || !VALID_STOCK_TYPES.includes(body.type)) {
        return NextResponse.json({ error: 'نوع المادة غير صالح' }, { status: 400 })
      }

      const item = await prisma.stockItem.create({
        data: {
          nameAr: body.nameAr.trim(),
          name: body.name || body.nameAr.trim(),
          type: body.type,
          feedCategory: body.feedCategory || null,
          unit: body.unit || 'كجم',
          currentStock: 0,
          minStock: body.minStock !== undefined && body.minStock !== '' ? parseFloat(body.minStock) : null,
          unitPrice: body.unitPrice !== undefined && body.unitPrice !== '' ? parseFloat(body.unitPrice) : null,
          supplier: body.supplier || null,
          proteinPct: body.proteinPct !== undefined && body.proteinPct !== '' ? parseFloat(body.proteinPct) : null,
          energyKcal: body.energyKcal !== undefined && body.energyKcal !== '' ? parseFloat(body.energyKcal) : null,
          reorderLevel: body.reorderLevel !== undefined && body.reorderLevel !== '' ? parseFloat(body.reorderLevel) : 50,
          notes: body.notes || null,
          isActive: true,
        }
      })

      await logActivity({
        userId: userId || undefined,
        action: 'CREATE',
        entity: 'StockItem',
        entityId: item.id,
        description: `إضافة مادة: ${item.nameAr}`,
        ipAddress: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent')
      })

      return NextResponse.json(item, { status: 201 })
    })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة المادة' }, { status: 500 })
  }
}
