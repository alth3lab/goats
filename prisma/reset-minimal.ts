
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Cleaning up database (keeping Users)...')

  // 1. Delete transactional/dependent data first
  await prisma.activityLog.deleteMany({})
  await prisma.payment.deleteMany({})
  await prisma.sale.deleteMany({})
  await prisma.feedingRecord.deleteMany({})
  await prisma.birth.deleteMany({}) // Also clears kidGoat relation if set, but table structure handles it
  await prisma.breeding.deleteMany({})
  await prisma.healthRecord.deleteMany({})
  
  // 2. Delete main entities
  await prisma.goat.deleteMany({})
  await prisma.pen.deleteMany({})
  
  // Note: We keep Users. We also keep GoatType/Breed or re-upsert them below to ensure they exist.

  console.log('Database cleaned. Seeding minimal data...')

  // 3. Ensure Types exist
  const goatType = await prisma.goatType.upsert({
    where: { name: 'GOAT' },
    update: {},
    create: { name: 'GOAT', nameAr: 'ماعز' }
  })

  // 4. Ensure Breeds exist (take a subset or all, just need some for the 10 goats)
  const breedData = [
    { name: 'Damascus', nameAr: 'شامي' },
    { name: 'Nubian', nameAr: 'نوبي' },
    { name: 'Aradi', nameAr: 'عارضي' }
  ]

  const breeds = []
  for (const b of breedData) {
    const breed = await prisma.breed.upsert({
      where: { typeId_name: { typeId: goatType.id, name: b.name } },
      update: {},
      create: {
        typeId: goatType.id,
        name: b.name,
        nameAr: b.nameAr
      }
    })
    breeds.push(breed)
  }

  // 5. Create 2 Pens
  const pen1 = await prisma.pen.create({
    data: {
      name: 'Main Pen',
      nameAr: 'العنبر الرئيسي',
      type: 'GENERAL',
      capacity: 50
    }
  })

  const pen2 = await prisma.pen.create({
    data: {
      name: 'Isolation Pen',
      nameAr: 'العزل',
      type: 'ISOLATION',
      capacity: 10
    }
  })

  // 6. Create 10 Goats
  const goatsToCreate = [
    { tagId: 'A001', name: 'Bella', gender: 'FEMALE', ageMonths: 24, weight: 45, breedIdx: 0, penId: pen1.id },
    { tagId: 'A002', name: 'Luna', gender: 'FEMALE', ageMonths: 18, weight: 40, breedIdx: 1, penId: pen1.id },
    { tagId: 'A003', name: 'Max', gender: 'MALE', ageMonths: 30, weight: 65, breedIdx: 0, penId: pen1.id }, // Buck
    { tagId: 'A004', name: 'Daisy', gender: 'FEMALE', ageMonths: 12, weight: 35, breedIdx: 2, penId: pen1.id },
    { tagId: 'A005', name: 'Rocky', gender: 'MALE', ageMonths: 8, weight: 25, breedIdx: 1, penId: pen1.id },
    { tagId: 'A006', name: 'Coco', gender: 'FEMALE', ageMonths: 36, weight: 50, breedIdx: 0, penId: pen1.id },
    { tagId: 'A007', name: 'Thor', gender: 'MALE', ageMonths: 4, weight: 15, breedIdx: 2, penId: pen2.id }, // Isolation
    { tagId: 'A008', name: 'Ruby', gender: 'FEMALE', ageMonths: 4, weight: 14, breedIdx: 0, penId: pen2.id }, // Isolation
    { tagId: 'A009', name: 'Oscar', gender: 'MALE', ageMonths: 48, weight: 70, breedIdx: 1, penId: pen1.id },
    { tagId: 'A010', name: 'Lucy', gender: 'FEMALE', ageMonths: 20, weight: 42, breedIdx: 2, penId: pen1.id },
  ]

  for (const g of goatsToCreate) {
    const birthDate = new Date()
    birthDate.setMonth(birthDate.getMonth() - g.ageMonths)

    await prisma.goat.create({
      data: {
        tagId: g.tagId,
        name: g.name,
        gender: g.gender as any,
        birthDate: birthDate,
        weight: g.weight,
        status: 'ACTIVE',
        breedId: breeds[g.breedIdx].id,
        penId: g.penId
      }
    })
  }

  console.log('Seeding complete: Created 10 goats.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
