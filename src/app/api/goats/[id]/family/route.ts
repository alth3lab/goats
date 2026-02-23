import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'

// Shared select for family members
const memberSelect = {
  id: true, tagId: true, name: true, gender: true,
  birthDate: true, status: true,
  breed: { select: { nameAr: true } }
}

// Build nested ancestor include up to N levels
function ancestorInclude(depth: number): Record<string, unknown> {
  if (depth <= 0) return { breed: { select: { nameAr: true } } }
  const child = ancestorInclude(depth - 1)
  return {
    breed: { select: { nameAr: true } },
    mother: { include: child },
    father: { include: child }
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'view_goats')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const { id } = await params

    const goat = await prisma.goat.findUnique({
      where: { id },
      include: {
        breed: { select: { nameAr: true } }
      }
    })

    if (!goat) {
      return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
    }

    // Ancestors: 3 levels up (parents → grandparents → great-grandparents)
    const ancestorInc = ancestorInclude(3)

    const [mother, father] = await Promise.all([
      goat.motherId
        ? prisma.goat.findUnique({ where: { id: goat.motherId }, include: ancestorInc })
        : null,
      goat.fatherId
        ? prisma.goat.findUnique({ where: { id: goat.fatherId }, include: ancestorInc })
        : null
    ])

    // Siblings: same birth + same mother
    const siblings = goat.birthId && goat.motherId
      ? await prisma.goat.findMany({
          where: { birthId: goat.birthId, motherId: goat.motherId, id: { not: goat.id } },
          select: memberSelect
        })
      : []

    // Offspring (children) — for both males and females
    const offspringWhere = goat.gender === 'MALE'
      ? { fatherId: goat.id }
      : { motherId: goat.id }

    const offspring = await prisma.goat.findMany({
      where: offspringWhere,
      select: {
        ...memberSelect,
        // Include grandchildren (1 level down from offspring)
        kidsAsMother: { select: memberSelect, take: 20 },
        kidsAsFather: { select: memberSelect, take: 20 }
      },
      orderBy: { birthDate: 'desc' }
    })

    // Mates: unique partners this animal has bred with
    const matesIds = new Set<string>()
    if (goat.gender === 'MALE') {
      const kids = await prisma.goat.findMany({
        where: { fatherId: goat.id, motherId: { not: null } },
        select: { motherId: true },
        distinct: ['motherId']
      })
      kids.forEach(k => k.motherId && matesIds.add(k.motherId))
    } else {
      const kids = await prisma.goat.findMany({
        where: { motherId: goat.id, fatherId: { not: null } },
        select: { fatherId: true },
        distinct: ['fatherId']
      })
      kids.forEach(k => k.fatherId && matesIds.add(k.fatherId))
    }

    const mates = matesIds.size > 0
      ? await prisma.goat.findMany({
          where: { id: { in: Array.from(matesIds) } },
          select: memberSelect
        })
      : []

    // Stats
    const totalOffspring = await prisma.goat.count({ where: offspringWhere })
    const maleOffspring = await prisma.goat.count({ where: { ...offspringWhere, gender: 'MALE' } })
    const femaleOffspring = await prisma.goat.count({ where: { ...offspringWhere, gender: 'FEMALE' } })
    const aliveOffspring = await prisma.goat.count({ where: { ...offspringWhere, status: 'ACTIVE' } })

    return NextResponse.json({
      goat,
      mother,
      father,
      siblings,
      offspring,
      mates,
      stats: {
        totalOffspring,
        maleOffspring,
        femaleOffspring,
        aliveOffspring,
        totalMates: mates.length,
        generations: mother || father ? (
          (mother?.mother || mother?.father || father?.mother || father?.father) ? 3 : 2
        ) : 1
      }
    })
  
    })
} catch (error) {
    console.error('Family API error:', error)
    return NextResponse.json({ error: 'فشل في جلب بيانات العائلة' }, { status: 500 })
  }
}
