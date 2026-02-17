import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateGoatAge, formatAge } from '@/lib/ageCalculator'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'
import { updateGoatSchema, validateBody } from '@/lib/validators/schemas'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'view_goats')
    if (auth.response) return auth.response

    const { id } = await params
    const goat = await prisma.goat.findUnique({
      where: { id },
      include: {
        breed: {
          include: {
            type: true
          }
        },
        pen: true,
        healthRecords: { orderBy: { date: 'desc' } },
        breedingAsMother: { include: { father: true, births: true } },
        breedingAsFather: { include: { mother: true, births: true } },
        feedingRecords: { orderBy: { date: 'desc' }, take: 30 },
        sales: true
      }
    })
    
    if (!goat) {
      return NextResponse.json({ error: 'الماعز غير موجود' }, { status: 404 })
    }
    
    // إضافة معلومات العمر
    const age = calculateGoatAge(goat.birthDate)
    const goatWithAge = {
      ...goat,
      age: {
        years: age.years,
        months: age.months,
        days: age.days,
        totalMonths: age.totalMonths,
        category: age.categoryAr,
        formatted: formatAge(age)
      }
    }
    
    return NextResponse.json(goatWithAge)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب البيانات' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'edit_goat')
    if (auth.response) return auth.response

    const { id } = await params
    const body = await request.json()
    const validation = validateBody(updateGoatSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const userId = await getUserIdFromRequest(request)
    
    const updateData = { ...validation.data } as Record<string, unknown>
    // إذا تغيرت الحالة إلى مباع أو متوفى، قم بإزالة الماعز من الحظيرة تلقائياً
    if (updateData.status === 'SOLD' || updateData.status === 'DECEASED') {
      updateData.penId = null
    }

    const goat = await prisma.goat.update({
      where: { id },
      data: updateData as any
    })
    await logActivity({
      userId: userId || undefined,
      action: 'UPDATE',
      entity: 'Goat',
      entityId: goat.id,
      description: `تم تعديل الماعز: ${goat.tagId}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })
    return NextResponse.json(goat)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في تحديث البيانات' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'delete_goat')
    if (auth.response) return auth.response

    const { id } = await params
    const userId = await getUserIdFromRequest(request)
    
    // التحقق من عدم وجود breeding نشط
    const activeBreeding = await prisma.breeding.findFirst({
      where: {
        OR: [
          { motherId: id },
          { fatherId: id }
        ],
        pregnancyStatus: { in: ['MATED', 'PREGNANT'] }
      }
    })
    
    if (activeBreeding) {
      const goat = await prisma.goat.findUnique({ where: { id }, select: { tagId: true } })
      return NextResponse.json(
        { error: `لا يمكن حذف الماعز ${goat?.tagId || ''} لأنه في سجل تكاثر نشط` },
        { status: 400 }
      )
    }
    
    const goat = await prisma.goat.delete({
      where: { id }
    })
    await logActivity({
      userId: userId || undefined,
      action: 'DELETE',
      entity: 'Goat',
      entityId: goat.id,
      description: `تم حذف الماعز: ${goat.tagId}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })
    return NextResponse.json({ message: 'تم الحذف بنجاح' })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في حذف الماعز' }, { status: 500 })
  }
}
