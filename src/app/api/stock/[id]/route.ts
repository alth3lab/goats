import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, getUserIdFromRequest } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'
import { logActivity } from '@/lib/activityLogger'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'view_inventory')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {
      const { id } = await params

      const item = await prisma.stockItem.findUnique({
        where: { id },
        include: {
          movements: {
            orderBy: { date: 'desc' },
            take: 50
          }
        }
      })

      if (!item) return NextResponse.json({ error: 'المادة غير موجودة' }, { status: 404 })
      return NextResponse.json(item)
    })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب المادة' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'edit_inventory')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {
      const { id } = await params
      const body = await request.json()
      const userId = await getUserIdFromRequest(request)

      if (body.nameAr !== undefined && !body.nameAr?.trim()) {
        return NextResponse.json({ error: 'الاسم بالعربية مطلوب' }, { status: 400 })
      }

      const item = await prisma.stockItem.update({
        where: { id },
        data: {
          nameAr: body.nameAr?.trim(),
          name: body.name,
          type: body.type,
          feedCategory: body.feedCategory ?? undefined,
          unit: body.unit,
          minStock: body.minStock !== undefined ? (body.minStock !== '' ? parseFloat(body.minStock) : null) : undefined,
          unitPrice: body.unitPrice !== undefined ? (body.unitPrice !== '' ? parseFloat(body.unitPrice) : null) : undefined,
          supplier: body.supplier ?? undefined,
          proteinPct: body.proteinPct !== undefined ? (body.proteinPct !== '' ? parseFloat(body.proteinPct) : null) : undefined,
          energyKcal: body.energyKcal !== undefined ? (body.energyKcal !== '' ? parseFloat(body.energyKcal) : null) : undefined,
          reorderLevel: body.reorderLevel !== undefined ? (body.reorderLevel !== '' ? parseFloat(body.reorderLevel) : null) : undefined,
          notes: body.notes ?? undefined,
          isActive: body.isActive ?? undefined,
        }
      })

      await logActivity({
        userId: userId || undefined,
        action: 'UPDATE',
        entity: 'StockItem',
        entityId: item.id,
        description: `تعديل مادة: ${item.nameAr}`,
        ipAddress: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent')
      })

      return NextResponse.json(item)
    })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في تعديل المادة' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'delete_inventory')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {
      const { id } = await params
      const userId = await getUserIdFromRequest(request)

      // Soft delete — mark inactive instead of destroying history
      const item = await prisma.stockItem.update({
        where: { id },
        data: { isActive: false }
      })

      await logActivity({
        userId: userId || undefined,
        action: 'DELETE',
        entity: 'StockItem',
        entityId: item.id,
        description: `أرشفة مادة: ${item.nameAr}`,
        ipAddress: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent')
      })

      return NextResponse.json({ success: true })
    })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في حذف المادة' }, { status: 500 })
  }
}
