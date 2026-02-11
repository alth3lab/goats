import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateGoatAge, formatAge } from '@/lib/ageCalculator'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'

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
    const userId = getUserIdFromRequest(request)
    
    // إذا تغيرت الحالة إلى مباع أو متوفى، قم بإزالة الماعز من الحظيرة تلقائياً
    if (body.status === 'SOLD' || body.status === 'DECEASED') {
      body.penId = null
    }

    const goat = await prisma.goat.update({
      where: { id },
      data: body
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
    const userId = getUserIdFromRequest(request)
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
