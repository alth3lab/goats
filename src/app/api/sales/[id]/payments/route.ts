import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'

export const runtime = 'nodejs'

// GET /api/sales/[id]/payments - جلب دفعات بيع معين
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'view_sales')
    if (auth.response) return auth.response

    const { id } = await params
    
    const payments = await prisma.payment.findMany({
      where: { saleId: id },
      orderBy: { paymentDate: 'desc' }
    })

    return NextResponse.json(payments)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب الدفعات' }, { status: 500 })
  }
}

// POST /api/sales/[id]/payments - إضافة دفعة جديدة
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'edit_sale')
    if (auth.response) return auth.response

    const { id } = await params
    const body = await request.json()
    const userId = await getUserIdFromRequest(request)

    // التحقق من وجود البيع
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        payments: true
      }
    })

    if (!sale) {
      return NextResponse.json({ error: 'البيع غير موجود' }, { status: 404 })
    }

    // حساب المبلغ المدفوع مسبقاً
    const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0)
    const remaining = sale.salePrice - totalPaid

    // التحقق من صحة المبلغ المدخل
    if (!body.amount || body.amount <= 0) {
      return NextResponse.json(
        { error: 'يجب إدخال مبلغ صحيح' },
        { status: 400 }
      )
    }

    // التحقق من أن المبلغ المدفوع لا يتجاوز المبلغ المتبقي
    if (body.amount > remaining) {
      return NextResponse.json(
        { error: `المبلغ المدفوع يتجاوز المبلغ المتبقي (${remaining} درهم)` },
        { status: 400 }
      )
    }

    // التحقق من عدم وجود مبالغ متبقية سالبة
    if (remaining <= 0) {
      return NextResponse.json(
        { error: 'تم سداد المبلغ بالكامل، لا يمكن إضافة دفعة جديدة' },
        { status: 400 }
      )
    }

    // إنشاء الدفعة
    const payment = await prisma.payment.create({
      data: {
        saleId: id,
        amount: body.amount,
        paymentDate: new Date(body.paymentDate),
        paymentMethod: body.paymentMethod || 'CASH',
        notes: body.notes || null
      }
    })

    // تحديث حالة الدفع في جدول المبيعات
    const newTotalPaid = totalPaid + body.amount
    const newStatus = 
      newTotalPaid >= sale.salePrice ? 'PAID' : 
      newTotalPaid > 0 ? 'PARTIAL' : 'PENDING'

    await prisma.sale.update({
      where: { id },
      data: { paymentStatus: newStatus }
    })

    await logActivity({
      userId: userId || undefined,
      action: 'UPDATE',
      entity: 'Sale',
      entityId: id,
      description: `تمت إضافة دفعة جديدة بقيمة ${body.amount}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error('Error adding payment:', error)
    return NextResponse.json({ error: 'فشل في إضافة الدفعة' }, { status: 500 })
  }
}
