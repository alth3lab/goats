import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateGoatAge, formatAge } from '@/lib/ageCalculator'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_goats')
    if (auth.response) return auth.response

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const format = searchParams.get('format')
    
    const goats = await prisma.goat.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        breed: {
          include: {
            type: true
          }
        },
        pen: true,
        healthRecords: {
          take: 5,
          orderBy: { date: 'desc' }
        },
        // إضافة سجلات التكاثر للأمهات
        breedingAsMother: {
          where: {
            pregnancyStatus: 'PREGNANT'
          },
          orderBy: { matingDate: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    // إضافة معلومات العمر وحالة الحمل لكل ماعز
    const goatsWithAge = goats.map(goat => {
      const age = calculateGoatAge(goat.birthDate)
      const currentBreeding = goat.breedingAsMother && goat.breedingAsMother.length > 0 ? goat.breedingAsMother[0] : null
      
      return {
        ...goat,
        age: {
          years: age.years,
          months: age.months,
          days: age.days,
          totalMonths: age.totalMonths,
          category: age.categoryAr,
          formatted: formatAge(age)
        },
        pregnancyStatus: currentBreeding ? currentBreeding.pregnancyStatus : null,
        dueDate: currentBreeding ? currentBreeding.dueDate : null
      }
    })
    
    if (format === 'csv') {
      const header = [
        'tagId',
        'name',
        'type',
        'breed',
        'gender',
        'status',
        'birthDate',
        'weight',
        'color',
        'pen',
        'notes'
      ]
      const rows = goatsWithAge.map((goat) => [
        goat.tagId,
        goat.name || '',
        goat.breed?.type?.nameAr || '',
        goat.breed?.nameAr || '',
        goat.gender,
        goat.status,
        goat.birthDate ? new Date(goat.birthDate).toISOString().slice(0, 10) : '',
        goat.weight?.toString() || '',
        goat.color || '',
        goat.pen?.nameAr || '',
        goat.notes || ''
      ])

      const csv = [header, ...rows]
        .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="goats.csv"'
        }
      })
    }

    return NextResponse.json(goatsWithAge)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب البيانات' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'add_goat')
    if (auth.response) return auth.response

    const body = await request.json()
    const userId = getUserIdFromRequest(request)
    const goat = await prisma.goat.create({
      data: body
    })
    await logActivity({
      userId: userId || undefined,
      action: 'CREATE',
      entity: 'Goat',
      entityId: goat.id,
      description: `تم إضافة الماعز: ${goat.tagId}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })
    return NextResponse.json(goat, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة الماعز' }, { status: 500 })
  }
}
