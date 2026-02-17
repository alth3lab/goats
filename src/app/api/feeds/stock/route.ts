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

    const stocks = await prisma.feedStock.findMany({
      include: {
        feedType: true
      },
      orderBy: { purchaseDate: 'desc' }
    })

    return NextResponse.json(stocks)
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في جلب مخزون الأعلاف' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'add_feed')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const body = await request.json()
    const userId = await getUserIdFromRequest(request)

    // Convert field names from frontend to database schema
    const createData: any = {
      feedTypeId: body.feedTypeId,
      quantity: parseFloat(body.quantity),
      unit: body.unit,
      cost: body.unitPrice ? parseFloat(body.unitPrice) : null,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : new Date(),
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      supplier: body.supplier || null,
      notes: body.notes || null
    }

    const stock = await prisma.feedStock.create({
      data: createData,
      include: { feedType: true }
    })

    await logActivity({
      userId: userId || undefined,
      action: 'CREATE',
      entity: 'FeedStock',
      entityId: stock.id,
      description: `إضافة مخزون ${stock.feedType.nameAr}: ${stock.quantity} ${stock.unit}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json(stock, { status: 201 })
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة المخزون' }, { status: 500 })
  }
}
