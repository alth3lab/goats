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
        }
      }
    })

    await logActivity({
      userId: userId || undefined,
      action: 'CREATE',
      entity: 'FeedingRecord',
      entityId: record.id,
      description: `تم تسجيل تغذية: ${record.feedType} - ${record.quantity} ${record.unit}${record.goat ? ` للماعز ${record.goat.tagId}` : ''}`,
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
