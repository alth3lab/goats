/**
 * Seed script for CAMEL type + breeds
 * Run: node prisma/seed-camels.js
 */
const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()

  try {
    // إنشاء نوع الإبل
    const camelType = await prisma.goatType.upsert({
      where: { name: 'CAMEL' },
      update: {},
      create: {
        name: 'CAMEL',
        nameAr: 'إبل',
        description: 'الإبل من أهم الحيوانات في الجزيرة العربية، تربى للحليب واللحم والسباقات'
      }
    })

    console.log('✅ تم إنشاء نوع الإبل:', camelType.id)

    // سلالات الإبل العربية
    const camelBreeds = [
      {
        name: 'Local',
        nameAr: 'محلي',
        description: 'إبل محلية من السلالات العربية الأصيلة، متأقلمة مع البيئة المحلية',
        avgWeight: 550,
        avgHeight: 185,
        characteristics: 'سلالة محلية أصيلة، متحملة للحرارة، إنتاج حليب جيد، متأقلمة مع البيئة'
      },
      {
        name: 'Hybrid',
        nameAr: 'مهجن',
        description: 'إبل مهجنة من تزاوج سلالات مختلفة لتحسين الإنتاج والصفات',
        avgWeight: 580,
        avgHeight: 188,
        characteristics: 'مهجنة، قوية البنية، إنتاجية عالية، تجمع صفات سلالات مختلفة'
      },
      {
        name: 'Sudanese',
        nameAr: 'سوداني',
        description: 'إبل سودانية تتميز بإنتاج الحليب العالي وهدوء الطباع',
        avgWeight: 520,
        avgHeight: 182,
        characteristics: 'إنتاج حليب مرتفع، هادئة الطباع، تتأقلم مع المناخات المختلفة'
      }
    ]

    let added = 0
    for (const breed of camelBreeds) {
      await prisma.breed.upsert({
        where: {
          typeId_name: {
            typeId: camelType.id,
            name: breed.name
          }
        },
        update: {},
        create: {
          ...breed,
          typeId: camelType.id
        }
      })
      added++
    }

    console.log(`✅ تم إضافة ${added} سلالة من الإبل`)
    console.log('✅ تم إضافة بيانات الإبل بنجاح!')
  } catch (e) {
    console.error('❌ خطأ:', e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
