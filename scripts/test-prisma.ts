import { prisma } from '../src/lib/prisma'

async function main() {
  const types = await prisma.goatType.findMany()
  console.log('types:', types.length)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
