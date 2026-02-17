import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'
import { createExpenseSchema, validateBody, parsePagination, paginatedResponse } from '@/lib/validators/schemas'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_expenses')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const searchParams = request.nextUrl.searchParams
    const format = searchParams.get('format')

    if (format === 'csv') {
      const expenses = await prisma.expense.findMany({ orderBy: { date: 'desc' } })
      const header = ['date', 'category', 'amount', 'description', 'notes']
      const rows = expenses.map((expense) => [
        new Date(expense.date).toISOString().slice(0, 10),
        expense.category,
        expense.amount.toString(),
        expense.description || '',
        expense.notes || ''
      ])
      const csv = [header, ...rows]
        .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"` ).join(','))
        .join('\n')
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="expenses.csv"'
        }
      })
    }

    const usePagination = searchParams.has('page')
    const { skip, take, page, limit } = parsePagination(searchParams)
    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({ orderBy: { date: 'desc' }, ...(usePagination ? { skip, take } : {}) }),
      usePagination ? prisma.expense.count() : Promise.resolve(0)
    ])
    if (usePagination) {
      return NextResponse.json(paginatedResponse(expenses, total, page, limit))
    }
    return NextResponse.json(expenses)
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في جلب المصروفات' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'add_expense')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const body = await request.json()
    const validation = validateBody(createExpenseSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const userId = await getUserIdFromRequest(request)
    const expense = await prisma.expense.create({
      data: validation.data as any
    })
    await logActivity({
      userId: userId || undefined,
      action: 'CREATE',
      entity: 'Expense',
      entityId: expense.id,
      description: `تم إضافة مصروف بقيمة ${expense.amount}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })
    return NextResponse.json(expense, { status: 201 })
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة المصروف' }, { status: 500 })
  }
}
