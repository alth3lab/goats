import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateGoatAge, formatAge } from '@/lib/ageCalculator'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'
import { createGoatSchema, validateBody, parsePagination, paginatedResponse } from '@/lib/validators/schemas'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_goats')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const format = searchParams.get('format')
    const animalType = searchParams.get('animalType') // GOAT, SHEEP, CAMEL etc.

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    if (status) where.status = status
    if (animalType) {
      where.breed = { type: { name: animalType.toUpperCase() } }
    }

    // CSV export returns all data without pagination
    if (format === 'csv') {
      const goats = await prisma.goat.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: { breed: { include: { type: true } }, pen: true },
        orderBy: { createdAt: 'desc' }
      })

      const header = ['tagId', 'name', 'type', 'breed', 'gender', 'status', 'birthDate', 'weight', 'color', 'pen', 'notes']
      const rows = goats.map((goat) => [
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

    const usePagination = searchParams.has('page')
    const { skip, take, page, limit } = parsePagination(searchParams)

    const [goats, total] = await Promise.all([
      prisma.goat.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          breed: { include: { type: true } },
          pen: true,
          healthRecords: { take: 5, orderBy: { date: 'desc' } },
          breedingAsMother: {
            where: { pregnancyStatus: 'PREGNANT' },
            orderBy: { matingDate: 'desc' },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' },
        ...(usePagination ? { skip, take } : {}),
      }),
      usePagination ? prisma.goat.count({ where: Object.keys(where).length > 0 ? where : undefined }) : Promise.resolve(0)
    ])
    
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

    if (usePagination) {
      return NextResponse.json(paginatedResponse(goatsWithAge, total, page, limit))
    }
    return NextResponse.json(goatsWithAge)
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في جلب البيانات' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'add_goat')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const body = await request.json()
    const validation = validateBody(createGoatSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Check goat limit across entire tenant (not just current farm)
    const tenant = await prisma.tenant.findUnique({ where: { id: auth.tenantId } })
    if (tenant) {
      const goatCount = await prisma.goat.count({ where: { farm: { tenantId: auth.tenantId } } })
      if (goatCount >= tenant.maxGoats) {
        return NextResponse.json(
          { error: `تم الوصول للحد الأقصى من الماعز (${tenant.maxGoats}). قم بترقية الخطة.` },
          { status: 403 }
        )
      }
    }

    const userId = await getUserIdFromRequest(request)
    const goat = await prisma.goat.create({
      data: validation.data as any
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
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة الماعز' }, { status: 500 })
  }
}
