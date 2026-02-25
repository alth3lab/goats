/**
 * سكربت ترحيل بيانات الأعلاف
 * 1) ملء farmId في FeedStock من feedType.farmId
 * 2) ربط FeedingRecord.feedTypeId بالمطابقة على اسم العلف
 *
 * تشغيل: npx tsx prisma/migrate-feeds.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== بدء ترحيل بيانات الأعلاف ===\n')

  // 1) ملء farmId في FeedStock
  console.log('1) ملء farmId في FeedStock...')
  const stocksWithoutFarm = await prisma.feedStock.findMany({
    where: { farmId: '' },
    include: { feedType: { select: { farmId: true } } }
  })

  let stockUpdated = 0
  for (const stock of stocksWithoutFarm) {
    if (stock.feedType?.farmId) {
      await prisma.feedStock.update({
        where: { id: stock.id },
        data: { farmId: stock.feedType.farmId }
      })
      stockUpdated++
    }
  }
  console.log(`   ✅ تم تحديث ${stockUpdated} من ${stocksWithoutFarm.length} سجل مخزون\n`)

  // 2) ربط FeedingRecord.feedTypeId
  console.log('2) ربط FeedingRecord.feedTypeId...')
  const unlinkedRecords = await prisma.feedingRecord.findMany({
    where: { feedTypeId: null },
    select: { id: true, feedType: true, tenantId: true }
  })

  // إنشاء خريطة أسماء → أنواع لكل tenant
  const feedTypes = await prisma.feedType.findMany({
    select: { id: true, name: true, nameAr: true, tenantId: true }
  })

  const feedTypeMap = new Map<string, string>() // "tenantId:name" → id
  for (const ft of feedTypes) {
    feedTypeMap.set(`${ft.tenantId}:${ft.name.toLowerCase()}`, ft.id)
    feedTypeMap.set(`${ft.tenantId}:${ft.nameAr.toLowerCase()}`, ft.id)
  }

  let linked = 0
  let unmatched = 0
  for (const record of unlinkedRecords) {
    const key1 = `${record.tenantId}:${record.feedType.toLowerCase()}`
    const feedTypeId = feedTypeMap.get(key1)
    if (feedTypeId) {
      await prisma.feedingRecord.update({
        where: { id: record.id },
        data: { feedTypeId }
      })
      linked++
    } else {
      unmatched++
    }
  }
  console.log(`   ✅ تم ربط ${linked} سجل`)
  if (unmatched > 0) {
    console.log(`   ⚠️  ${unmatched} سجل لم يتطابق (سيبقى feedTypeId = null)`)
  }

  console.log('\n=== انتهى الترحيل بنجاح ===')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
