import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'view_feeds')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const { id } = await params

    const record = await prisma.feedingRecord.findUnique({
      where: { id },
      include: {
        goat: {
          select: {
            tagId: true,
            name: true,
            breed: { select: { nameAr: true } }
          }
        }
      }
    })

    if (!record) {
      return NextResponse.json({ error: 'السجل غير موجود' }, { status: 404 })
    }

    return NextResponse.json(record)
  
    })
} catch (error) {
    console.error('Error fetching feeding record:', error)
    return NextResponse.json({ error: 'فشل في جلب السجل' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'manage_feeds')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const { id } = await params
    const body = await request.json()
    const userId = await getUserIdFromRequest(request)

    const record = await prisma.feedingRecord.update({
      where: { id },
      data: {
        goatId: body.goatId || null,
        date: body.date ? new Date(body.date) : undefined,
        feedType: body.feedType,
        quantity: body.quantity ? Number(body.quantity) : undefined,
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
      action: 'UPDATE',
      entity: 'FeedingRecord',
      entityId: record.id,
      description: `تم تحديث سجل التغذية${record.goat ? ` لـ ${record.goat.tagId}` : ''}`,

      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json(record)
  
    })
} catch (error) {
    console.error('Error updating feeding record:', error)
    return NextResponse.json({ error: 'فشل في تحديث السجل' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'manage_feeds')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const { id } = await params
    const userId = await getUserIdFromRequest(request)

    const record = await prisma.feedingRecord.findUnique({ where: { id } })
    if (!record) {
      return NextResponse.json({ error: 'السجل غير موجود' }, { status: 404 })
    }

    await prisma.feedingRecord.delete({ where: { id } })

    await logActivity({
      userId: userId || undefined,
      action: 'DELETE',
      entity: 'FeedingRecord',
      entityId: id,
      description: `تم حذف سجل التغذية`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json({ success: true })
  
    })
} catch (error) {
    console.error('Error deleting feeding record:', error)
    return NextResponse.json({ error: 'فشل في حذف السجل' }, { status: 500 })
  }
}
