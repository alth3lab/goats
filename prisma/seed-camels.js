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
        name: 'Majaheem',
        nameAr: 'مجاهيم',
        description: 'من أشهر وأضخم سلالات الإبل في الجزيرة العربية، تتميز بلونها الأسود',
        avgWeight: 600,
        avgHeight: 190,
        characteristics: 'لون أسود داكن، ضخمة الحجم، إنتاج حليب عالي، تتحمل الحرارة'
      },
      {
        name: 'Maghateer',
        nameAr: 'مغاتير',
        description: 'سلالة مميزة بلونها الأبيض، تربى للجمال والسباقات',
        avgWeight: 500,
        avgHeight: 185,
        characteristics: 'لون أبيض فاتح، رشيقة، سريعة، مرغوبة في مسابقات الجمال'
      },
      {
        name: 'Safra',
        nameAr: 'صفراء',
        description: 'سلالة ذات لون أصفر ذهبي، منتشرة في الخليج العربي',
        avgWeight: 520,
        avgHeight: 180,
        characteristics: 'لون أصفر ذهبي، متوسطة الحجم، إنتاج حليب جيد'
      },
      {
        name: 'Hamra',
        nameAr: 'حمراء',
        description: 'سلالة ذات لون أحمر بني، من السلالات المحلية المميزة',
        avgWeight: 480,
        avgHeight: 175,
        characteristics: 'لون أحمر بني، متينة، متحملة للظروف الصحراوية القاسية'
      },
      {
        name: 'Shaalah',
        nameAr: 'شعلة',
        description: 'سلالة مخصصة للسباقات والركض',
        avgWeight: 450,
        avgHeight: 180,
        characteristics: 'خفيفة الوزن، سريعة، أرجل طويلة، تستخدم في السباقات'
      },
      {
        name: 'Omani',
        nameAr: 'عمانية',
        description: 'سلالة عمانية محلية تتميز بالصلابة والتحمل',
        avgWeight: 470,
        avgHeight: 178,
        characteristics: 'متوسطة الحجم، قوية، متأقلمة مع البيئة الجبلية والساحلية'
      },
      {
        name: 'Sudanese',
        nameAr: 'سودانية',
        description: 'سلالة أفريقية تتميز بإنتاج الحليب العالي',
        avgWeight: 550,
        avgHeight: 185,
        characteristics: 'إنتاج حليب مرتفع، هادئة الطباع، تتأقلم مع المناخات المختلفة'
      },
      {
        name: 'Waddah',
        nameAr: 'وضح',
        description: 'سلالة بيضاء ناصعة مرغوبة في مسابقات الجمال',
        avgWeight: 500,
        avgHeight: 182,
        characteristics: 'لون أبيض ناصع، جميلة المظهر، هادئة، تربى للجمال والحليب'
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
