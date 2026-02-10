import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const sales = await prisma.sale.findMany({
      include: { 
        goat: {
          include: {
            breed: {
              include: {
                type: true
              }
            }
          }
        },
        payments: {
          orderBy: { paymentDate: 'desc' }
        }
      },
      orderBy: { date: 'desc' }
    })

    // حساب المبلغ المدفوع والمتبقي لكل بيع
    const salesWithPayments = sales.map(sale => {
      const totalPaid = sale.payments.reduce((sum, payment) => sum + payment.amount, 0)
      const remaining = sale.salePrice - totalPaid
      
      return {
        ...sale,
        totalPaid,
        remaining,
        payments: sale.payments
      }
    })

    return NextResponse.json(salesWithPayments)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب المبيعات' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // استخدام transaction لضمان إنشاء البيع وتحديث حالة الماعز معاً
    const sale = await prisma.$transaction(async (tx) => {
      // 1. إنشاء سجل البيع مبدئياً بحالة معلق
      const newSale = await tx.sale.create({
        data: {
          goatId: body.goatId || null,
          date: new Date(body.date),
          buyerName: body.buyerName,
          buyerPhone: body.buyerPhone,
          salePrice: Number(body.salePrice),
          paymentStatus: 'PENDING', // الحالة الافتراضية
          notes: body.notes
        }
      })

      // 2. معالجة الدفعة الأولى إذا وجدت
      let finalStatus = 'PENDING'
      if (body.paidAmount && Number(body.paidAmount) > 0) {
        const amount = Number(body.paidAmount)
        const salePrice = Number(body.salePrice)

        // إنشاء سجل الدفعة
        await tx.payment.create({
          data: {
            saleId: newSale.id,
            amount: amount,
            paymentDate: new Date(body.date), // نفس تاريخ البيع
            paymentMethod: 'CASH', // افتراضياً نقد
            notes: 'دفعة أولية عند تسجيل البيع'
          }
        })

        // تحديد الحالة بناءً على المبلغ المدفوع
        if (amount >= salePrice) {
          finalStatus = 'PAID'
        } else {
          finalStatus = 'PARTIAL'
        }

        // تحديث حالة البيع
        await tx.sale.update({
          where: { id: newSale.id },
          data: { paymentStatus: finalStatus as any }
        })
      }

      // 3. تحديث حالة الماعز إلى "مباع" وتصفير الحظيرة إذا كان البيع مرتبطاً بماعز
      if (body.goatId) {
        await tx.goat.update({
          where: { id: body.goatId },
          data: { 
            status: 'SOLD',
            penId: null // إزالة الماعز من الحظيرة
          }
        })
      }

      // إرجاع البيع المحدث مع الحالة النهائية
      return { ...newSale, paymentStatus: finalStatus }
    })

    return NextResponse.json(sale, { status: 201 })
  } catch (error) {
    console.error('Error creating sale:', error)
    return NextResponse.json({ error: 'فشل في إضافة البيع' }, { status: 500 })
  }
}
