const { PrismaClient } = require('@prisma/client')
const mariadb = require('mariadb')
const { PrismaMariaDb } = require('@prisma/adapter-mariadb')
require('dotenv').config()

async function createPrismaClient() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'موجود' : 'غير موجود')
  
  const dbUrl = new URL(process.env.DATABASE_URL)
  console.log('الاتصال بـ:', `${dbUrl.hostname}:${dbUrl.port}`)
  
  const pool = mariadb.createPool({
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port || '3306'),
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.substring(1),
    connectionLimit: 5
  })
  
  const adapter = new PrismaMariaDb(pool)
  return new PrismaClient({ adapter })
}

async function main(prisma) {
  console.log('🌱 بدء إضافة البيانات الأولية...')

  // إنشاء أنواع الحيوانات
  const goatType = await prisma.goatType.upsert({
    where: { name: 'GOAT' },
    update: {},
    create: {
      name: 'GOAT',
      nameAr: 'ماعز',
      description: 'الماعز حيوان ثديي يربى للحصول على اللحوم والحليب'
    }
  })

  const sheepType = await prisma.goatType.upsert({
    where: { name: 'SHEEP' },
    update: {},
    create: {
      name: 'SHEEP',
      nameAr: 'خروف',
      description: 'الخروف حيوان ثديي يربى للحصول على اللحوم والصوف'
    }
  })

  console.log('✅ تم إنشاء الأنواع:', goatType.nameAr, sheepType.nameAr)

  // سلالات الماعز
  const goatBreeds = [
    {
      name: 'Damascus',
      nameAr: 'شامي',
      description: 'ماعز الشام أو الدمشقي، من أشهر سلالات الماعز في المنطقة',
      avgWeight: 70,
      avgHeight: 80,
      characteristics: 'آذان طويلة متدلية، أنف محدب، إنتاج حليب عالي'
    },
    {
      name: 'Nubian',
      nameAr: 'نوبي',
      description: 'الماعز النوبي من السلالات المتميزة في إنتاج الحليب',
      avgWeight: 65,
      avgHeight: 75,
      characteristics: 'آذان طويلة، أنف روماني، ألوان متعددة'
    },
    {
      name: 'Aradi',
      nameAr: 'عارضي',
      description: 'من السلالات المحلية في الجزيرة العربية',
      avgWeight: 45,
      avgHeight: 65,
      characteristics: 'متأقلم مع البيئة الصحراوية، مقاوم للحرارة'
    },
    {
      name: 'Najdi',
      nameAr: 'نجدي',
      description: 'سلالة محلية من منطقة نجد',
      avgWeight: 50,
      avgHeight: 70,
      characteristics: 'قوي البنية، متحمل للظروف القاسية'
    },
    {
      name: 'Boer',
      nameAr: 'بور',
      description: 'سلالة جنوب أفريقية متخصصة في إنتاج اللحم',
      avgWeight: 85,
      avgHeight: 85,
      characteristics: 'رأس بني وجسم أبيض، نمو سريع، لحم عالي الجودة'
    }
  ]

  // سلالات الخروف
  const sheepBreeds = [
    {
      name: 'Naimi',
      nameAr: 'نعيمي',
      description: 'من أشهر سلالات الأغنام في الإمارات والخليج',
      avgWeight: 60,
      avgHeight: 70,
      characteristics: 'ذيل دهني كبير، صوف خشن، لون أبيض أو بني'
    },
    {
      name: 'Awassi',
      nameAr: 'عواسي',
      description: 'سلالة شامية منتشرة في المشرق العربي',
      avgWeight: 65,
      avgHeight: 75,
      characteristics: 'ذيل دهني، آذان متدلية، إنتاج حليب جيد'
    },
    {
      name: 'Harri',
      nameAr: 'حري',
      description: 'سلالة محلية من المناطق الجبلية',
      avgWeight: 45,
      avgHeight: 65,
      characteristics: 'متوسط الحجم، قوي، متحمل للظروف القاسية'
    },
    {
      name: 'Najdi',
      nameAr: 'نجدي',
      description: 'سلالة محلية من منطقة نجد',
      avgWeight: 55,
      avgHeight: 68,
      characteristics: 'لون أسود في الرأس والأطراف، جسم أبيض'
    }
  ]

  // إضافة سلالات الماعز
  for (const breed of goatBreeds) {
    await prisma.breed.upsert({
      where: { 
        typeId_name: {
          typeId: goatType.id,
          name: breed.name
        }
      },
      update: {},
      create: {
        ...breed,
        typeId: goatType.id
      }
    })
  }

  console.log(`✅ تم إضافة ${goatBreeds.length} سلالة من الماعز`)

  // إضافة سلالات الخروف
  for (const breed of sheepBreeds) {
    await prisma.breed.upsert({
      where: { 
        typeId_name: {
          typeId: sheepType.id,
          name: breed.name
        }
      },
      update: {},
      create: {
        ...breed,
        typeId: sheepType.id
      }
    })
  }

  console.log(`✅ تم إضافة ${sheepBreeds.length} سلالة من الخروف`)
  console.log('✅ تم إضافة جميع البيانات الأولية بنجاح!')
}

async function run() {
  const prisma = await createPrismaClient()
  
  try {
    await main(prisma)
  } catch (e) {
    console.error('❌ خطأ في إضافة البيانات:', e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

run()
