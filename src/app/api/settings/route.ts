import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'

// GET /api/settings - get current farm settings
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_settings')
    if (auth.response) return auth.response

    return runWithTenant(auth.tenantId, auth.farmId, async () => {
      const farm = await prisma.farm.findUnique({
        where: { id: auth.farmId }
      })

      if (!farm) {
        return NextResponse.json({ error: 'المزرعة غير موجودة' }, { status: 404 })
      }

      return NextResponse.json({
        farmName: farm.name,
        phone: farm.phone || '',
        address: farm.address || '',
        currency: farm.currency,
        notifications: farm.notifications,
        alertPenCapacityPercent: farm.alertPenCapacityPercent,
        alertDeathCount: farm.alertDeathCount,
        alertDeathWindowDays: farm.alertDeathWindowDays,
        alertBreedingOverdueDays: farm.alertBreedingOverdueDays,
      })
    })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب الإعدادات' }, { status: 500 })
  }
}

// PUT /api/settings - update current farm settings (OWNER/ADMIN only)
export async function PUT(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_settings')
    if (auth.response) return auth.response

    if (!['SUPER_ADMIN', 'OWNER', 'ADMIN'].includes(auth.user.role)) {
      return NextResponse.json({ error: 'فقط المالك أو المدير يمكنه تعديل الإعدادات' }, { status: 403 })
    }

    return runWithTenant(auth.tenantId, auth.farmId, async () => {
      const body = await request.json()

      const farm = await prisma.farm.update({
        where: { id: auth.farmId },
        data: {
          name: body.farmName ?? undefined,
          nameAr: body.farmName ?? undefined,
          phone: body.phone ?? undefined,
          address: body.address ?? undefined,
          currency: body.currency ?? undefined,
          notifications: body.notifications ?? undefined,
          alertPenCapacityPercent: body.alertPenCapacityPercent ?? undefined,
          alertDeathCount: body.alertDeathCount ?? undefined,
          alertDeathWindowDays: body.alertDeathWindowDays ?? undefined,
          alertBreedingOverdueDays: body.alertBreedingOverdueDays ?? undefined,
        }
      })

      return NextResponse.json({
        farmName: farm.name,
        phone: farm.phone || '',
        address: farm.address || '',
        currency: farm.currency,
        notifications: farm.notifications,
        alertPenCapacityPercent: farm.alertPenCapacityPercent,
        alertDeathCount: farm.alertDeathCount,
        alertDeathWindowDays: farm.alertDeathWindowDays,
        alertBreedingOverdueDays: farm.alertBreedingOverdueDays,
      })
    })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في حفظ الإعدادات' }, { status: 500 })
  }
}
