import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

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
    if (lowStock) {
      where.currentStock = { lte: prisma.raw('minStock') }
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        transactions: {
          take: 5,
          orderBy: { date: 'desc' }
        }
      },
      orderBy: { nameAr: 'asc' }
    })

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
    const item = await prisma.inventoryItem.create({
      data: body
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة الصنف' }, { status: 500 })
  }
}
