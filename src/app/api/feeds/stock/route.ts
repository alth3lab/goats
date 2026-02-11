import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, getUserIdFromRequest } from '@/lib/auth'
import { logActivity } from '@/lib/activityLogger'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_feeds')
    if (auth.response) return auth.response

    const stocks = await prisma.feedStock.findMany({
      include: {
        feedType: true
      },
      orderBy: { purchaseDate: 'desc' }
    })

    return NextResponse.json(stocks)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب مخزون الأعلاف' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'manage_feeds')
    if (auth.response) return auth.response

    const body = await request.json()
    const userId = getUserIdFromRequest(request)

    const stock = await prisma.feedStock.create({
      data: body,
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
  } catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة المخزون' }, { status: 500 })
  }
}
