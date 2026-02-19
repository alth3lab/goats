import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'

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
      return NextResponse.json({ error: 'الحيوان غير موجود' }, { status: 404 })
    }

    const [mother, father] = await Promise.all([
      goat.motherId
        ? prisma.goat.findUnique({
            where: { id: goat.motherId },
            include: { 
              breed: { select: { nameAr: true } },
              mother: { include: { breed: { select: { nameAr: true } } } },
              father: { include: { breed: { select: { nameAr: true } } } }
            }
          })
        : null,
      goat.fatherId
        ? prisma.goat.findUnique({
            where: { id: goat.fatherId },
            include: { 
              breed: { select: { nameAr: true } },
              mother: { include: { breed: { select: { nameAr: true } } } },
              father: { include: { breed: { select: { nameAr: true } } } }
            }
          })
        : null
    ])

    // Fix: Only find siblings if birthId is not null AND motherId matches
    const siblings = goat.birthId && goat.motherId
      ? await prisma.goat.findMany({
          where: {
            birthId: goat.birthId,
            motherId: goat.motherId,
            id: { not: goat.id }
          },
          include: { breed: { select: { nameAr: true } } }
        })
      : []

    const offspring = await prisma.goat.findMany({
      where: { motherId: goat.id },
      include: { breed: { select: { nameAr: true } } }
    })

    return NextResponse.json({
      goat,
      mother,
      father,
      siblings,
      offspring
    })
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في جلب بيانات العائلة' }, { status: 500 })
  }
}
