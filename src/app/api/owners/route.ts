import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_goats')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const searchParams = request.nextUrl.searchParams
    const activeOnly = searchParams.get('active') === 'true'

    const where = activeOnly ? { isActive: true } : {}

    const owners = await prisma.owner.findMany({
      where,
      include: {
        _count: {
          select: {
            goats: { where: { status: 'ACTIVE' } },
            expenses: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get financial summaries for each owner
    const ownersWithStats = await Promise.all(
      owners.map(async (owner) => {
        const [totalExpenses, salesData] = await Promise.all([
          prisma.expense.aggregate({
            _sum: { amount: true },
            where: { ownerId: owner.id }
          }),
          prisma.sale.aggregate({
            _sum: { salePrice: true },
            _count: true,
            where: { ownerId: owner.id }
          })
        ])

        return {
          ...owner,
          totalExpenses: Number(totalExpenses._sum.amount || 0),
          totalSales: Number(salesData._sum.salePrice || 0),
          salesCount: salesData._count,
          activeGoats: owner._count.goats,
          expensesCount: owner._count.expenses
        }
      })
    )

    return NextResponse.json(ownersWithStats)
  
    })
  } catch (error) {
    console.error('GET /api/owners failed:', error)
    return NextResponse.json({ error: 'فشل في جلب بيانات الملاك' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'add_goat')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const body = await request.json()
    const { name, phone, idNumber, address, notes } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'اسم المالك مطلوب' }, { status: 400 })
    }

    const userId = await getUserIdFromRequest(request)
    const owner = await prisma.owner.create({
      data: {
        name: name.trim(),
        phone: phone || null,
        idNumber: idNumber || null,
        address: address || null,
        notes: notes || null
      }
    })

    await logActivity({
      userId: userId || undefined,
      action: 'CREATE',
      entity: 'Owner',
      entityId: owner.id,
      description: `تم إضافة مالك: ${owner.name}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json(owner, { status: 201 })
  
    })
  } catch (error) {
    console.error('POST /api/owners failed:', error)
    return NextResponse.json({ error: 'فشل في إضافة المالك' }, { status: 500 })
  }
}
