import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_health')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const searchParams = request.nextUrl.searchParams
    const goatId = searchParams.get('goatId')
    
    const records = await prisma.healthRecord.findMany({
      where: goatId ? { goatId } : undefined,
      include: { goat: true },
      orderBy: { date: 'desc' }
    })
    
    return NextResponse.json(records)
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في جلب السجلات الصحية' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'add_health')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const body = await request.json()
    const { goatId, type, date, description, veterinarian, cost, nextDueDate, moveToIsolation } = body
    const userId = await getUserIdFromRequest(request)

    // Transaction to handle record creation + potential isolation
    const result = await prisma.$transaction(async (tx) => {
        const record = await tx.healthRecord.create({
            data: {
                goatId,
                type,
                date: new Date(date),
                description,
                veterinarian,
                cost: cost ? Number(cost) : null,
                nextDueDate: nextDueDate ? new Date(nextDueDate) : null
            },
            include: { goat: true }
        })

        if (moveToIsolation) {
            const isoPen = await tx.pen.findFirst({
                where: { type: 'ISOLATION' }
            })
            
            if (isoPen) {
                await tx.goat.update({
                    where: { id: goatId },
                    data: {
                        status: 'QUARANTINE',
                        penId: isoPen.id
                    }
                })
            }
        }
        return record
    })

    // إنشاء حدث في التقويم للتطعيمات والمواعيد القادمة
    try {
      const typeLabels: Record<string, string> = {
        VACCINATION: 'تطعيم', DEWORMING: 'مضاد ديدان', TREATMENT: 'علاج', CHECKUP: 'فحص', SURGERY: 'جراحة'
      }
      const eventTypeMap: Record<string, string> = {
        VACCINATION: 'VACCINATION', DEWORMING: 'DEWORMING', TREATMENT: 'CHECKUP', CHECKUP: 'CHECKUP', SURGERY: 'CHECKUP'
      }
      const label = typeLabels[type] || type
      const calEventType = eventTypeMap[type] || 'CHECKUP'

      await prisma.calendarEvent.create({
        data: {
          eventType: calEventType as any,
          title: `${label}: ${result.goat.tagId}`,
          description: description || '',
          date: new Date(date),
          goatId,
          isCompleted: true,
          createdBy: userId
        }
      })

      // إضافة حدث للموعد القادم
      if (nextDueDate) {
        await prisma.calendarEvent.create({
          data: {
            eventType: calEventType as any,
            title: `${label} قادم: ${result.goat.tagId}`,
            description: `موعد ${label} التالي`,
            date: new Date(nextDueDate),
            goatId,
            reminder: true,
            createdBy: userId
          }
        })
      }
    } catch (calendarError) {
      console.error('Failed to create calendar event:', calendarError)
    }

    await logActivity({
      userId: userId || undefined,
      action: 'CREATE',
      entity: 'Health',
      entityId: result.id,
      description: `تم إضافة سجل صحي: ${result.goat.tagId}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json(result, { status: 201 })
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة السجل الصحي' }, { status: 500 })
  }
}
