import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { createInventoryItemSchema, validateBody } from '@/lib/validators/schemas'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_inventory')
    if (auth.response) return auth.response

    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const lowStock = searchParams.get('lowStock') === 'true'

    const where: any = {}
    if (category && category !== 'ALL') {
      where.category = category
    }

    let items = await prisma.inventoryItem.findMany({
      where,
      include: {
        transactions: {
          take: 5,
          orderBy: { date: 'desc' }
        }
      },
      orderBy: { nameAr: 'asc' }
    })

    // Filter for low stock items if requested
    if (lowStock) {
      items = items.filter(item => item.minStock !== null && item.currentStock <= item.minStock)
    }

    return NextResponse.json(items)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب المخزون' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'add_inventory')
    if (auth.response) return auth.response

    const body = await request.json()
    const validation = validateBody(createInventoryItemSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const item = await prisma.inventoryItem.create({
      data: validation.data as any
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة الصنف' }, { status: 500 })
  }
}
