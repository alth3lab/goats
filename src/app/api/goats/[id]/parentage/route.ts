import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parentageSchema } from '@/lib/validators/goatFamily'

export const runtime = 'nodejs'

const MAX_DEPTH = 6

async function isAncestor(candidateParentId: string, childId: string) {
  let currentIds: string[] = [candidateParentId]
  let depth = 0

  while (currentIds.length > 0 && depth < MAX_DEPTH) {
    if (currentIds.includes(childId)) return true

    const parents = await prisma.goat.findMany({
      where: { id: { in: currentIds } },
      select: { motherId: true, fatherId: true }
    })

    const nextIds = parents
      .flatMap((p) => [p.motherId, p.fatherId])
      .filter((id): id is string => Boolean(id))

    if (nextIds.includes(childId)) return true

    currentIds = nextIds
    depth += 1
  }

  return false
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = parentageSchema.parse(await request.json())

    const goat = await prisma.goat.findUnique({
      where: { id },
      select: { id: true, birthDate: true }
    })

    if (!goat) {
      return NextResponse.json({ error: 'الماعز غير موجود' }, { status: 404 })
    }

    let motherId = body.motherId ?? null
    let fatherId = body.fatherId ?? null
    let motherTagId = body.motherTagId ?? null
    let fatherTagId = body.fatherTagId ?? null

    if (motherTagId && !motherId) {
      const mother = await prisma.goat.findUnique({
        where: { tagId: motherTagId },
        select: { id: true, tagId: true, gender: true, status: true, birthDate: true }
      })
      if (!mother) {
        return NextResponse.json({ error: 'الأم غير موجودة' }, { status: 400 })
      }
      motherId = mother.id
    }

    if (fatherTagId && !fatherId) {
      const father = await prisma.goat.findUnique({
        where: { tagId: fatherTagId },
        select: { id: true, tagId: true, gender: true, status: true }
      })
      if (!father) {
        return NextResponse.json({ error: 'الأب غير موجود' }, { status: 400 })
      }
      fatherId = father.id
    }

    if (motherId) {
      const mother = await prisma.goat.findUnique({
        where: { id: motherId },
        select: { id: true, tagId: true, gender: true, status: true, birthDate: true }
      })
      if (!mother) {
        return NextResponse.json({ error: 'الأم غير موجودة' }, { status: 400 })
      }
      if (mother.gender !== 'FEMALE' || mother.status !== 'ACTIVE') {
        return NextResponse.json({ error: 'الأم يجب أن تكون أنثى وحالتها نشطة' }, { status: 400 })
      }
      if (await isAncestor(mother.id, id)) {
        return NextResponse.json({ error: 'لا يمكن تعيين الأم لأنها ضمن النسب' }, { status: 400 })
      }
      const minBirthDate = new Date(mother.birthDate)
      minBirthDate.setMonth(minBirthDate.getMonth() + 6)
      if (new Date(goat.birthDate) < minBirthDate) {
        return NextResponse.json({ error: 'تاريخ ميلاد الابن غير منطقي مقارنة بالأم' }, { status: 400 })
      }
      motherTagId = mother.tagId
    }

    if (fatherId) {
      const father = await prisma.goat.findUnique({
        where: { id: fatherId },
        select: { id: true, tagId: true, gender: true, status: true }
      })
      if (!father) {
        return NextResponse.json({ error: 'الأب غير موجود' }, { status: 400 })
      }
      if (father.gender !== 'MALE' || father.status !== 'ACTIVE') {
        return NextResponse.json({ error: 'الأب يجب أن يكون ذكر وحالته نشطة' }, { status: 400 })
      }
      if (await isAncestor(father.id, id)) {
        return NextResponse.json({ error: 'لا يمكن تعيين الأب لأنه ضمن النسب' }, { status: 400 })
      }
      fatherTagId = father.tagId
    }

    const updated = await prisma.goat.update({
      where: { id },
      data: {
        motherId,
        fatherId,
        motherTagId,
        fatherTagId
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في تحديث النسب' }, { status: 500 })
  }
}
