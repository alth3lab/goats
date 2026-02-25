import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    const auth = await requirePermission(request, 'edit_sale')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const { id: saleId, paymentId } = await params
    const userId = await getUserIdFromRequest(request)

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { payments: true }
    })

    if (!sale) {
      return NextResponse.json({ error: 'عملية البيع غير موجودة' }, { status: 404 })
    }

    const payment = sale.payments.find((p) => p.id === paymentId)
    if (!payment) {
      return NextResponse.json({ error: 'الدفعة غير موجودة' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.delete({ where: { id: paymentId } })

      const remainingPayments = await tx.payment.findMany({
        where: { saleId },
        select: { amount: true }
      })

      const totalPaid = remainingPayments.reduce((sum, item) => sum + item.amount, 0)
      const paymentStatus =
        totalPaid >= sale.salePrice ? 'PAID' :
        totalPaid > 0 ? 'PARTIAL' :
        'PENDING'

      await tx.sale.update({
        where: { id: saleId },
        data: { paymentStatus }
      })
    })

    await logActivity({
      userId: userId || undefined,
      action: 'DELETE',
      entity: 'Payment',
      entityId: paymentId,
      description: `تم حذف دفعة بقيمة ${payment.amount} من عملية بيع`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json({ success: true })
  
    })
} catch (error) {
    console.error('Error deleting payment:', error)
    return NextResponse.json({ error: 'فشل في حذف الدفعة' }, { status: 500 })
  }
}
