import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_expenses')
    if (auth.response) return auth.response

    const format = request.nextUrl.searchParams.get('format')
    const expenses = await prisma.expense.findMany({
      orderBy: { date: 'desc' }
    })
    if (format === 'csv') {
      const header = ['date', 'category', 'amount', 'description', 'notes']
      const rows = expenses.map((expense) => [
        new Date(expense.date).toISOString().slice(0, 10),
        expense.category,
        expense.amount.toString(),
        expense.description || '',
        expense.notes || ''
      ])

      const csv = [header, ...rows]
        .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="expenses.csv"'
        }
      })
    }

    return NextResponse.json(expenses)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب المصروفات' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'add_expense')
    if (auth.response) return auth.response

    const body = await request.json()
    const userId = getUserIdFromRequest(request)
    const expense = await prisma.expense.create({
      data: body
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
  } catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة المصروف' }, { status: 500 })
  }
}
