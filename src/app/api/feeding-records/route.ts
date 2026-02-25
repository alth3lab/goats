import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_feeds')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const searchParams = request.nextUrl.searchParams
    const goatId = searchParams.get('goatId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}
    if (goatId) where.goatId = goatId
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    const records = await prisma.feedingRecord.findMany({
      where,
      include: {
        goat: {
          select: {
            tagId: true,
            name: true,
            breed: { select: { nameAr: true } }
          }
        },
        feedTypeRef: {
          select: {
            nameAr: true,
            category: true
          }
        }
      },
      orderBy: { date: 'desc' }
    })

    return NextResponse.json(records)
  
    })
} catch (error) {
    console.error('Error fetching feeding records:', error)
    return NextResponse.json({ error: 'فشل في جلب سجلات التغذية' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'manage_feeds')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const body = await request.json()
    const userId = await getUserIdFromRequest(request)

    const record = await prisma.feedingRecord.create({
      data: {
        goatId: body.goatId || null,
        date: new Date(body.date),
        feedType: body.feedType,
        feedTypeId: body.feedTypeId || null,
        quantity: Number(body.quantity),
        unit: body.unit,
        cost: body.cost ? Number(body.cost) : null,
        notes: body.notes || null
      },
      include: {
        goat: {
          select: {
            tagId: true,
            name: true
          }
        },
        feedTypeRef: {
          select: {
            nameAr: true,
            category: true
          }
        }
      }
    })

    // Deduct from stock if feedTypeId is provided (DI-03)
    if (record.feedTypeId && record.quantity > 0) {
      try {
        const stocks = await prisma.feedStock.findMany({
          where: { feedTypeId: record.feedTypeId, quantity: { gt: 0 } },
          orderBy: [{ purchaseDate: 'asc' }, { createdAt: 'asc' }]
        })
        let remaining = record.quantity
        for (const stock of stocks) {
          if (remaining <= 0) break
          const used = Math.min(stock.quantity, remaining)
          await prisma.feedStock.update({
            where: { id: stock.id },
            data: { quantity: Number((stock.quantity - used).toFixed(4)) }
          })
          remaining -= used
        }
      } catch (e) {
        console.error('Failed to deduct stock for feeding record:', e)
      }
    }

    await logActivity({
      userId: userId || undefined,
      action: 'CREATE',
      entity: 'FeedingRecord',
      entityId: record.id,
      description: `تم تسجيل تغذية: ${record.feedType} - ${record.quantity} ${record.unit}${record.goat ? ` لـ ${record.goat.tagId}` : ''}`,

      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json(record, { status: 201 })
  
    })
} catch (error) {
    console.error('Error creating feeding record:', error)
    return NextResponse.json({ error: 'فشل في إضافة سجل التغذية' }, { status: 500 })
  }
}
