import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const expenses = await prisma.expense.findMany({
      orderBy: { date: 'desc' }
    })
    return NextResponse.json(expenses)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب المصروفات' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const expense = await prisma.expense.create({
      data: body
    })
    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة المصروف' }, { status: 500 })
  }
}
