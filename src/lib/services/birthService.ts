import { PrismaClient, BirthStatus, Gender } from '@prisma/client'

export type KidInput = {
  tagId?: string
  gender: Gender
  weight?: number
  status: BirthStatus
  notes?: string | null
}

export type RecordBirthInput = {
  breedingId: string
  birthDate: Date
  kids: KidInput[]
}

const MIN_MOTHER_AGE_MONTHS = 6

export async function recordBirth(prisma: PrismaClient, input: RecordBirthInput) {
  const breeding = await prisma.breeding.findUnique({
    where: { id: input.breedingId },
    include: { mother: true, father: true }
  })

  if (!breeding) {
    throw new Error('سجل التزاوج غير موجود')
  }

  if (breeding.mother.status !== 'ACTIVE' || breeding.mother.gender !== 'FEMALE') {
    throw new Error('لا يمكن تسجيل ولادة لأم غير نشطة أو ليست أنثى')
  }

  if (breeding.father && (breeding.father.status !== 'ACTIVE' || breeding.father.gender !== 'MALE')) {
    throw new Error('الأب يجب أن يكون ذكر وحالته نشطة')
  }

  const minBirth = new Date(breeding.mother.birthDate)
  minBirth.setMonth(minBirth.getMonth() + MIN_MOTHER_AGE_MONTHS)
  if (input.birthDate < minBirth) {
    throw new Error('تاريخ الولادة غير منطقي مقارنة بعمر الأم')
  }

  return prisma.$transaction(async (tx) => {
    const results = [] as Array<{ birthId: string; goatId: string }>

    for (let i = 0; i < input.kids.length; i += 1) {
      const kid = input.kids[i]
      const tagId = kid.tagId && kid.tagId.trim().length > 0
        ? kid.tagId.trim()
        : `TEMP-${input.breedingId.slice(0, 8)}-${i + 1}`

      const birth = await tx.birth.create({
        data: {
          breedingId: input.breedingId,
          kidTagId: tagId,
          gender: kid.gender,
          weight: kid.weight ?? null,
          status: kid.status,
          notes: kid.notes ?? null
        }
      })

      const goat = await tx.goat.create({
        data: {
          tagId,
          gender: kid.gender,
          birthDate: input.birthDate,
          weight: kid.weight ?? null,
          status: 'ACTIVE',
          breedId: breeding.mother.breedId,
          motherId: breeding.motherId,
          fatherId: breeding.fatherId,
          birthId: birth.id
        }
      })

      await tx.birth.update({
        where: { id: birth.id },
        data: { kidGoatId: goat.id, kidTagId: tagId }
      })

      results.push({ birthId: birth.id, goatId: goat.id })
    }

    await tx.breeding.update({
      where: { id: input.breedingId },
      data: {
        birthDate: input.birthDate,
        pregnancyStatus: 'DELIVERED'
      }
    })

    return results
  })
}
