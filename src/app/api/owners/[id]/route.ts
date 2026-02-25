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
    const auth = await requirePermission(request, 'view_goats')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const { id } = await params

    const owner = await prisma.owner.findUnique({
      where: { id },
      include: {
        goats: {
          where: { status: 'ACTIVE' },
          include: {
            breed: { include: { type: true } },
            pen: true
          },
          orderBy: { createdAt: 'desc' }
        },
        expenses: {
          orderBy: { date: 'desc' },
          take: 20
        }
      }
    })

    if (!owner) {
      return NextResponse.json({ error: 'المالك غير موجود' }, { status: 404 })
    }

    // Get sales for this owner's animals
    const sales = await prisma.sale.findMany({
      where: { ownerId: id },
      include: {
        goat: { select: { tagId: true, name: true } },
        payments: true
      },
      orderBy: { date: 'desc' },
      take: 20
    })

    // Financial summary
    const [totalExpenses, totalSales, expensesByCategory] = await Promise.all([
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { ownerId: id }
      }),
      prisma.sale.aggregate({
        _sum: { salePrice: true },
        _count: true,
        where: { ownerId: id }
      }),
      prisma.expense.groupBy({
        by: ['category'],
        _sum: { amount: true },
        where: { ownerId: id }
      })
    ])

    // Count all goats (not just active)
    const allGoatsCount = await prisma.goat.count({
      where: { ownerId: id }
    })
    const activeGoatsCount = await prisma.goat.count({
      where: { ownerId: id, status: 'ACTIVE' }
    })
    const soldGoatsCount = await prisma.goat.count({
      where: { ownerId: id, status: 'SOLD' }
    })
    const deceasedGoatsCount = await prisma.goat.count({
      where: { ownerId: id, status: 'DECEASED' }
    })

    const expensesTotal = Number(totalExpenses._sum.amount || 0)
    const salesTotal = Number(totalSales._sum.salePrice || 0)

    return NextResponse.json({
      ...owner,
      sales,
      financialSummary: {
        totalExpenses: expensesTotal,
        totalSales: salesTotal,
        netProfit: salesTotal - expensesTotal,
        salesCount: totalSales._count,
        expensesByCategory: expensesByCategory.map(e => ({
          category: e.category,
          amount: Number(e._sum.amount || 0)
        }))
      },
      goatsCount: {
        total: allGoatsCount,
        active: activeGoatsCount,
        sold: soldGoatsCount,
        deceased: deceasedGoatsCount
      }
    })
  
    })
  } catch (error) {
    console.error('GET /api/owners/[id] failed:', error)
    return NextResponse.json({ error: 'فشل في جلب بيانات المالك' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'edit_goat')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.owner.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'المالك غير موجود' }, { status: 404 })
    }

    const userId = await getUserIdFromRequest(request)
    const updated = await prisma.owner.update({
      where: { id },
      data: {
        name: body.name?.trim() || existing.name,
        phone: body.phone !== undefined ? body.phone : existing.phone,
        idNumber: body.idNumber !== undefined ? body.idNumber : existing.idNumber,
        address: body.address !== undefined ? body.address : existing.address,
        notes: body.notes !== undefined ? body.notes : existing.notes,
        isActive: body.isActive !== undefined ? body.isActive : existing.isActive
      }
    })

    await logActivity({
      userId: userId || undefined,
      action: 'UPDATE',
      entity: 'Owner',
      entityId: id,
      description: `تم تعديل بيانات المالك: ${updated.name}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json(updated)
  
    })
  } catch (error) {
    console.error('PUT /api/owners/[id] failed:', error)
    return NextResponse.json({ error: 'فشل في تعديل المالك' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'delete_goat')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const { id } = await params

    const existing = await prisma.owner.findUnique({
      where: { id },
      include: { _count: { select: { goats: { where: { status: 'ACTIVE' } } } } }
    })
    if (!existing) {
      return NextResponse.json({ error: 'المالك غير موجود' }, { status: 404 })
    }

    if (existing._count.goats > 0) {
      return NextResponse.json(
        { error: `لا يمكن حذف المالك لأن لديه ${existing._count.goats} حيوانات نشطة. قم بنقل الحيوانات أولاً.` },
        { status: 400 }
      )
    }

    const userId = await getUserIdFromRequest(request)

    // Nullify ownerId on related records instead of deleting them
    await prisma.$transaction([
      prisma.goat.updateMany({ where: { ownerId: id }, data: { ownerId: null } }),
      prisma.expense.updateMany({ where: { ownerId: id }, data: { ownerId: null } }),
      prisma.sale.updateMany({ where: { ownerId: id }, data: { ownerId: null } }),
      prisma.owner.delete({ where: { id } })
    ])

    await logActivity({
      userId: userId || undefined,
      action: 'DELETE',
      entity: 'Owner',
      entityId: id,
      description: `تم حذف المالك: ${existing.name}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json({ success: true })
  
    })
  } catch (error) {
    console.error('DELETE /api/owners/[id] failed:', error)
    return NextResponse.json({ error: 'فشل في حذف المالك' }, { status: 500 })
  }
}
