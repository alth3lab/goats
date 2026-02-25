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
    include: { 
      mother: { select: { id: true, tagId: true, birthDate: true, status: true, gender: true, breedId: true } }, 
      father: { select: { id: true, tagId: true, status: true, gender: true } } 
    }
  })

  if (!breeding) {
    throw new Error('سجل التزاوج غير موجود')
  }

  if (breeding.mother.gender !== 'FEMALE') {
    throw new Error(`${breeding.mother.tagId} ليس أنثى`)
  }

  if (breeding.mother.status !== 'ACTIVE') {
    throw new Error(`الأم ${breeding.mother.tagId} غير نشطة (الحالة: ${breeding.mother.status})`)
  }

  if (breeding.father && breeding.father.gender !== 'MALE') {
    throw new Error(`${breeding.father.tagId} ليس ذكر`)
  }

  if (breeding.father && !['ACTIVE', 'EXTERNAL'].includes(breeding.father.status)) {
    throw new Error(`الأب ${breeding.father.tagId} غير نشط (الحالة: ${breeding.father.status})`)
  }

  const minBirth = new Date(breeding.mother.birthDate)
  minBirth.setMonth(minBirth.getMonth() + MIN_MOTHER_AGE_MONTHS)
  if (input.birthDate < minBirth) {
    throw new Error('تاريخ الولادة غير منطقي مقارنة بعمر الأم')
  }

  return prisma.$transaction(async (tx) => {
    const results = [] as Array<{ birthId: string; goatId: string }>

    // التحقق من عدم تكرار tagIds داخل نفس الطلب
    const allTagIds = input.kids
      .map(k => k.tagId?.trim())
      .filter(t => t && t.length > 0) as string[]
    
    const uniqueTagIds = new Set(allTagIds)
    if (uniqueTagIds.size !== allTagIds.length) {
      throw new Error('لا يمكن استخدام نفس رقم الشريحة أكثر من مرة')
    }

    // التحقق من عدم وجود tagIds موجودة بالفعل
    if (allTagIds.length > 0) {
      const existingGoats = await tx.goat.findMany({
        where: { tagId: { in: allTagIds } },
        select: { tagId: true }
      })
      if (existingGoats.length > 0) {
        throw new Error(`رقم الشريحة موجود بالفعل: ${existingGoats.map(g => g.tagId).join(', ')}`)
      }
    }

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
          motherTagId: breeding.mother.tagId,
          fatherTagId: breeding.father?.tagId ?? null,
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
        numberOfKids: input.kids.length,
        pregnancyStatus: 'DELIVERED'
      }
    })

    // إنشاء حدث في التقويم للولادة + حدث الفطام
    try {
      await tx.calendarEvent.create({
        data: {
          eventType: 'BIRTH',
          title: `ولادة: ${breeding.mother.tagId}`,
          description: `ولادة ${input.kids.length} ${input.kids.length === 1 ? 'صغير' : 'صغار'} من الأم ${breeding.mother.tagId}`,
          date: input.birthDate,
          goatId: breeding.motherId,
          isCompleted: true
        }
      })
      
      // إضافة حدث الفطام بعد 3 أشهر
      const weaningDate = new Date(input.birthDate)
      weaningDate.setMonth(weaningDate.getMonth() + 3)
      
      await tx.calendarEvent.create({
        data: {
          eventType: 'WEANING',
          title: `فطام: ${breeding.mother.tagId}`,
          description: `موعد فطام ${input.kids.length} ${input.kids.length === 1 ? 'صغير' : 'صغار'}`,
          date: weaningDate,
          goatId: breeding.motherId,
          reminder: true,
          reminderDays: 7
        }
      })
    } catch (calendarError) {
      console.error('Failed to create calendar events:', calendarError)
    }

    return results
  })
}
