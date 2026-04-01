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
    const auth = await requirePermission(request, 'view_health')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {
      const { id } = await params
      const record = await prisma.healthRecord.findUnique({
        where: { id },
        include: { goat: true }
      })
      if (!record) {
        return NextResponse.json({ error: 'السجل الصحي غير موجود' }, { status: 404 })
      }
      return NextResponse.json(record)
    })
  } catch {
    return NextResponse.json({ error: 'فشل في جلب السجل الصحي' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'add_health')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {
      const { id } = await params
      const body = await request.json()
      const { type, date, description, veterinarian, cost, nextDueDate } = body
      const userId = await getUserIdFromRequest(request)

      const existing = await prisma.healthRecord.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json({ error: 'السجل الصحي غير موجود' }, { status: 404 })
      }

      const record = await prisma.healthRecord.update({
        where: { id },
        data: {
          type: type ?? existing.type,
          date: date ? new Date(date) : existing.date,
          description: description !== undefined ? description : existing.description,
          veterinarian: veterinarian !== undefined ? veterinarian : existing.veterinarian,
          cost: cost !== undefined ? (cost ? Number(cost) : null) : existing.cost,
          nextDueDate: nextDueDate !== undefined ? (nextDueDate ? new Date(nextDueDate) : null) : existing.nextDueDate
        },
        include: { goat: true }
      })

      await logActivity({
        userId: userId || undefined,
        action: 'UPDATE',
        entity: 'HealthRecord',
        entityId: id,
        description: `تم تعديل السجل الصحي للحيوان: ${record.goat?.tagId}`,
        ipAddress: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent')
      })

      return NextResponse.json(record)
    })
  } catch {
    return NextResponse.json({ error: 'فشل في تحديث السجل الصحي' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'add_health')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {
      const { id } = await params
      const userId = await getUserIdFromRequest(request)

      const existing = await prisma.healthRecord.findUnique({
        where: { id },
        include: { goat: true }
      })
      if (!existing) {
        return NextResponse.json({ error: 'السجل الصحي غير موجود' }, { status: 404 })
      }

      await prisma.healthRecord.delete({ where: { id } })

      await logActivity({
        userId: userId || undefined,
        action: 'DELETE',
        entity: 'HealthRecord',
        entityId: id,
        description: `تم حذف السجل الصحي للحيوان: ${existing.goat?.tagId}`,
        ipAddress: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent')
      })

      return NextResponse.json({ success: true })
    })
  } catch {
    return NextResponse.json({ error: 'فشل في حذف السجل الصحي' }, { status: 500 })
  }
}
