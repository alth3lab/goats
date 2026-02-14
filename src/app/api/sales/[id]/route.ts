import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'

export const runtime = 'nodejs'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'edit_sale')
    if (auth.response) return auth.response

    const { id } = await params
    const body = await request.json()
    const userId = getUserIdFromRequest(request)

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { payments: true }
    })

    if (!sale) {
      return NextResponse.json({ error: 'عملية البيع غير موجودة' }, { status: 404 })
    }

    const salePrice = Number(body.salePrice)
    if (!Number.isFinite(salePrice) || salePrice <= 0) {
      return NextResponse.json({ error: 'سعر البيع يجب أن يكون أكبر من صفر' }, { status: 400 })
    }

    const totalPaid = sale.payments.reduce((sum, payment) => sum + payment.amount, 0)
    if (salePrice < totalPaid) {
      return NextResponse.json(
        { error: `لا يمكن جعل سعر البيع أقل من المبلغ المدفوع (${totalPaid} درهم)` },
        { status: 400 }
      )
    }

    const paymentStatus =
      totalPaid >= salePrice ? 'PAID' :
      totalPaid > 0 ? 'PARTIAL' :
      'PENDING'

    const updated = await prisma.sale.update({
      where: { id },
      data: {
        date: body.date ? new Date(body.date) : sale.date,
        buyerName: body.buyerName ?? sale.buyerName,
        buyerPhone: body.buyerPhone ?? null,
        salePrice,
        notes: body.notes ?? null,
        paymentStatus
      },
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
      }
    })

    await logActivity({
      userId: userId || undefined,
      action: 'UPDATE',
      entity: 'Sale',
      entityId: updated.id,
      description: `تم تعديل عملية البيع بقيمة ${updated.salePrice}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    const updatedTotalPaid = updated.payments.reduce((sum, payment) => sum + payment.amount, 0)
    const remaining = updated.salePrice - updatedTotalPaid

    return NextResponse.json({
      ...updated,
      totalPaid: updatedTotalPaid,
      remaining
    })
  } catch (error) {
    console.error('Error updating sale:', error)
    return NextResponse.json({ error: 'فشل في تعديل عملية البيع' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'edit_sale')
    if (auth.response) return auth.response

    const { id } = await params
    const userId = getUserIdFromRequest(request)

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        include: {
          goat: true,
          payments: true
        }
      })

      if (!sale) {
        throw new Error('NOT_FOUND')
      }

      await tx.sale.delete({ where: { id } })

      if (sale.goatId) {
        const generalPens = await tx.pen.findMany({
          where: {
            OR: [{ type: 'GENERAL' }, { type: null }]
          },
          include: {
            _count: {
              select: { goats: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        })

        const availableGeneralPen = generalPens.find(
          (pen) => pen.capacity === null || pen._count.goats < pen.capacity
        )

        let targetPenId = availableGeneralPen?.id || null

        if (!targetPenId) {
          const anyPens = await tx.pen.findMany({
            include: {
              _count: {
                select: { goats: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          })

          const availableAnyPen = anyPens.find(
            (pen) => pen.capacity === null || pen._count.goats < pen.capacity
          )

          targetPenId = availableAnyPen?.id || null
        }

        await tx.goat.update({
          where: { id: sale.goatId },
          data: {
            status: 'ACTIVE',
            penId: targetPenId
          }
        })
      }

      return {
        id: sale.id,
        salePrice: sale.salePrice,
        buyerName: sale.buyerName
      }
    })

    await logActivity({
      userId: userId || undefined,
      action: 'DELETE',
      entity: 'Sale',
      entityId: result.id,
      description: `تم إلغاء عملية البيع للمشتري ${result.buyerName} بقيمة ${result.salePrice}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'عملية البيع غير موجودة' }, { status: 404 })
    }

    console.error('Error deleting sale:', error)
    return NextResponse.json({ error: 'فشل في إلغاء عملية البيع' }, { status: 500 })
  }
}
