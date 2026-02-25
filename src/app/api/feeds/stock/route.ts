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
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : null
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : null

    const stocks = await prisma.feedStock.findMany({
      include: {
        feedType: true
      },
      orderBy: { purchaseDate: 'desc' },
      ...(page !== null && limit ? { skip: (page - 1) * limit, take: limit } : {})
    })

    // If paginated, include total count
    if (page !== null && limit) {
      const total = await prisma.feedStock.count()
      return NextResponse.json({ data: stocks, total, page, limit })
    }

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

    // Input validation (SEC-04)
    if (!body.feedTypeId) {
      return NextResponse.json({ error: 'نوع العلف مطلوب' }, { status: 400 })
    }
    const qty = parseFloat(body.quantity)
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: 'الكمية يجب أن تكون أكبر من صفر' }, { status: 400 })
    }
    if (body.unitPrice !== undefined && body.unitPrice !== null && body.unitPrice !== '') {
      const price = parseFloat(body.unitPrice)
      if (isNaN(price) || price < 0) {
        return NextResponse.json({ error: 'السعر لا يمكن أن يكون سالباً' }, { status: 400 })
      }
    }
    if (body.expiryDate && body.purchaseDate && new Date(body.expiryDate) < new Date(body.purchaseDate)) {
      return NextResponse.json({ error: 'تاريخ الانتهاء لا يمكن أن يكون قبل تاريخ الشراء' }, { status: 400 })
    }

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

    // Auto-create expense record for the purchase
    const totalCost = stock.quantity * (stock.cost || 0)
    if (totalCost > 0) {
      try {
        await prisma.expense.create({
          data: {
            date: stock.purchaseDate,
            category: 'FEED',
            description: `شراء علف: ${stock.feedType.nameAr} — ${stock.quantity} ${stock.unit}`,
            amount: totalCost,
            notes: stock.supplier ? `المورد: ${stock.supplier}` : null
          }
        })
      } catch (e) {
        // Don't fail the stock creation if expense creation fails
        console.error('Failed to auto-create expense:', e)
      }
    }

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
