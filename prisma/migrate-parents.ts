import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const goats = await prisma.goat.findMany({
    where: {
      OR: [
        { motherTagId: { not: null } },
        { fatherTagId: { not: null } }
      ]
    },
    select: {
      id: true,
      tagId: true,
      motherTagId: true,
      fatherTagId: true,
      motherId: true,
      fatherId: true
    }
  })

  let updated = 0

  for (const goat of goats) {
    const data: { motherId?: string | null; fatherId?: string | null } = {}

    if (!goat.motherId && goat.motherTagId) {
      const mother = await prisma.goat.findUnique({
        where: { tagId: goat.motherTagId },
        select: { id: true }
      })
      if (mother) data.motherId = mother.id
    }

    if (!goat.fatherId && goat.fatherTagId) {
      const father = await prisma.goat.findUnique({
        where: { tagId: goat.fatherTagId },
        select: { id: true }
      })
      if (father) data.fatherId = father.id
    }

    if (Object.keys(data).length > 0) {
      await prisma.goat.update({
        where: { id: goat.id },
        data
      })
      updated += 1
    }
  }

  console.log(`Updated ${updated} goats with parent IDs.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
