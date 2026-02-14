import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'view_expenses')
    if (auth.response) return auth.response

    const { id } = await params
    const expense = await prisma.expense.findUnique({ where: { id } })

    if (!expense) {
      return NextResponse.json({ error: 'المصروف غير موجود' }, { status: 404 })
    }

    return NextResponse.json(expense)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب المصروف' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'add_expense')
    if (auth.response) return auth.response

    const { id } = await params
    const body = await request.json()
    const userId = getUserIdFromRequest(request)

    const existing = await prisma.expense.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'المصروف غير موجود' }, { status: 404 })
    }

    const amount = Number(body.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'المبلغ يجب أن يكون أكبر من صفر' }, { status: 400 })
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        date: body.date ? new Date(body.date) : existing.date,
        category: body.category ?? existing.category,
        description: body.description ?? existing.description,
        amount,
        paymentMethod: body.paymentMethod || null,
        notes: body.notes || null
      }
    })

    await logActivity({
      userId: userId || undefined,
      action: 'UPDATE',
      entity: 'Expense',
      entityId: updated.id,
      description: `تم تعديل مصروف بقيمة ${updated.amount}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في تعديل المصروف' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'add_expense')
    if (auth.response) return auth.response

    const { id } = await params
    const userId = getUserIdFromRequest(request)

    const existing = await prisma.expense.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'المصروف غير موجود' }, { status: 404 })
    }

    await prisma.expense.delete({ where: { id } })

    await logActivity({
      userId: userId || undefined,
      action: 'DELETE',
      entity: 'Expense',
      entityId: id,
      description: `تم حذف مصروف بقيمة ${existing.amount}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في حذف المصروف' }, { status: 500 })
  }
}
