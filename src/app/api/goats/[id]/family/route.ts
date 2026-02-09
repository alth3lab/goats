import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const goat = await prisma.goat.findUnique({
      where: { id },
      include: {
        breed: { select: { nameAr: true } }
      }
    })

    if (!goat) {
      return NextResponse.json({ error: 'الماعز غير موجود' }, { status: 404 })
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

    const siblings = goat.birthId
      ? await prisma.goat.findMany({
          where: {
            birthId: goat.birthId,
            motherId: goat.motherId ?? undefined,
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
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب بيانات العائلة' }, { status: 500 })
  }
}
