import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'

// GET /api/admin/tenants/[tenantId]/data — View tenant data read-only (SUPER_ADMIN only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response

    if (auth.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    const { tenantId } = await params
    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section') || 'summary'

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, nameAr: true, email: true, plan: true, isActive: true },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'المستأجر غير موجود' }, { status: 404 })
    }

    if (section === 'summary') {
      const [goats, health, sales, farms, users, breedings, expenses] = await Promise.all([
        prisma.goat.count({ where: { farm: { tenantId } } }),
        prisma.healthRecord.count({ where: { goat: { farm: { tenantId } } } }),
        prisma.sale.count({ where: { goat: { farm: { tenantId } } } }),
        prisma.farm.count({ where: { tenantId } }),
        prisma.user.count({ where: { tenantId, role: { not: 'SUPER_ADMIN' } } }),
        prisma.breeding.count({ where: { tenantId } }),
        prisma.expense.count({ where: { farm: { tenantId } } }),
      ])
      return NextResponse.json({ tenant, data: { goatsCount: goats, healthCount: health, salesCount: sales, farmsCount: farms, usersCount: users, breedingsCount: breedings, expensesCount: expenses } })
    }

    if (section === 'goats') {
      const goats = await prisma.goat.findMany({
        where: { farm: { tenantId } },
        include: {
          breed: { select: { nameAr: true, name: true } },
          pen: { select: { name: true } },
          farm: { select: { name: true, nameAr: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      })
      return NextResponse.json({ tenant, data: { goats } })
    }

    if (section === 'health') {
      const health = await prisma.healthRecord.findMany({
        where: { goat: { farm: { tenantId } } },
        include: {
          goat: { select: { name: true, tagId: true } },
        },
        orderBy: { date: 'desc' },
        take: 200,
      })
      return NextResponse.json({ tenant, data: { records: health } })
    }

    if (section === 'sales') {
      const sales = await prisma.sale.findMany({
        where: { goat: { farm: { tenantId } } },
        include: {
          goat: { select: { name: true, tagId: true } },
        },
        orderBy: { date: 'desc' },
        take: 200,
      })
      return NextResponse.json({ tenant, data: { sales } })
    }

    if (section === 'activities') {
      const activities = await prisma.activityLog.findMany({
        where: { tenantId },
        include: {
          user: { select: { fullName: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
      return NextResponse.json({ tenant, data: { activities } })
    }

    return NextResponse.json({ tenant, message: 'قسم غير معروف' })
  } catch (error) {
    console.error('Admin tenant data error:', error)
    return NextResponse.json({ error: 'فشل في جلب بيانات المستأجر' }, { status: 500 })
  }
}
