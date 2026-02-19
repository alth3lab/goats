import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_sales')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const format = request.nextUrl.searchParams.get('format')
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

    if (format === 'csv') {
      const header = [
        'date',
        'goatTag',
        'type',
        'breed',
        'buyerName',
        'buyerPhone',
        'salePrice',
        'paymentStatus',
        'totalPaid',
        'remaining',
        'notes'
      ]
      const rows = salesWithPayments.map((sale) => [
        new Date(sale.date).toISOString().slice(0, 10),
        sale.goat?.tagId || '',
        sale.goat?.breed?.type?.nameAr || '',
        sale.goat?.breed?.nameAr || '',
        sale.buyerName,
        sale.buyerPhone || '',
        sale.salePrice.toString(),
        sale.paymentStatus,
        sale.totalPaid.toString(),
        sale.remaining.toString(),
        sale.notes || ''
      ])

      const csv = [header, ...rows]
        .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="sales.csv"'
        }
      })
    }

    return NextResponse.json(salesWithPayments)
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في جلب المبيعات' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'add_sale')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const body = await request.json()
    const userId = await getUserIdFromRequest(request)

    // التحقق من أن الماعز ليس في تكاثر نشط
    if (body.goatId) {
      const activeBreeding = await prisma.breeding.findFirst({
        where: {
          OR: [
            { motherId: body.goatId },
            { fatherId: body.goatId }
          ],
          pregnancyStatus: { in: ['MATED', 'PREGNANT'] }
        },
        include: {
          mother: { select: { tagId: true } },
          father: { select: { tagId: true } }
        }
      })

      if (activeBreeding) {
        const goat = await prisma.goat.findUnique({ 
          where: { id: body.goatId },
          select: { tagId: true, gender: true }
        })
        const role = goat?.gender === 'FEMALE' ? 'أم' : 'أب'
        return NextResponse.json(
          { error: `لا يمكن بيع الحيوان ${goat?.tagId} لأنه ${role} في سجل تكاثر نشط (${activeBreeding.pregnancyStatus})` },
          { status: 400 }
        )
      }
    }

    // استخدام transaction لضمان إنشاء البيع وتحديث حالة الماعز معاً
    const sale = await prisma.$transaction(async (tx) => {
      // 0. التحقق من أن الماعز ليس مستخدماً في تكاثر نشط
      if (body.goatId) {
        const activeBreeding = await tx.breeding.findFirst({
          where: {
            OR: [
              { motherId: body.goatId },
              { fatherId: body.goatId }
            ],
            pregnancyStatus: { in: ['MATED', 'PREGNANT'] }
          },
          include: { mother: true, father: true }
        })

        if (activeBreeding) {
          const goatRole = activeBreeding.motherId === body.goatId ? 'أم' : 'أب'
          throw new Error(`لا يمكن بيع هذا الماعز لأنه ${goatRole} في سجل تكاثر نشط`)
        }
      }

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

    // إنشاء حدث في التقويم للبيع
    try {
      const goat = body.goatId ? await prisma.goat.findUnique({ where: { id: body.goatId } }) : null
      await prisma.calendarEvent.create({
        data: {
          eventType: 'SALE',
          title: `بيع: ${goat?.tagId || 'دون تحديد'}`,
          description: `بيع للمشتري: ${body.buyerName} - المبلغ: ${sale.salePrice} درهم`,
          date: new Date(body.date),
          goatId: body.goatId || null,
          isCompleted: true,
          createdBy: userId
        }
      })
    } catch (calendarError) {
      console.error('Failed to create calendar event:', calendarError)
    }

    await logActivity({
      userId: userId || undefined,
      action: 'CREATE',
      entity: 'Sale',
      entityId: sale.id,
      description: `تم تسجيل عملية بيع بقيمة ${sale.salePrice}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json(sale, { status: 201 })
  
    })
} catch (error) {
    console.error('Error creating sale:', error)
    const message = error instanceof Error ? error.message : 'فشل في إضافة البيع'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
