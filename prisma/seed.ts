import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('بدء إضافة البيانات الأولية...')

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

  console.log('تم إنشاء الأنواع:', goatType.nameAr, sheepType.nameAr)

  // إنشاء نوع الإبل
  const camelType = await prisma.goatType.upsert({
    where: { name: 'CAMEL' },
    update: {},
    create: {
      name: 'CAMEL',
      nameAr: 'إبل',
      description: 'الإبل حيوان ثديي يربى للحصول على اللحوم والحليب والسباقات'
    }
  })

  console.log('تم إنشاء نوع الإبل:', camelType.nameAr)

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
    },
    {
      name: 'Haري',
      nameAr: 'حري',
      description: 'من السلالات الجبلية المحلية',
      avgWeight: 40,
      avgHeight: 60,
      characteristics: 'صغير الحجم، متسلق ماهر، متأقلم مع المناطق الجبلية'
    },
    {
      name: 'Jabal',
      nameAr: 'جبلي',
      description: 'ماعز جبلي محلي',
      avgWeight: 42,
      avgHeight: 62,
      characteristics: 'رشيق، قوي، يتحمل التضاريس الصعبة'
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
    },
    {
      name: 'Barbari',
      nameAr: 'بربري',
      description: 'سلالة شمال أفريقية',
      avgWeight: 50,
      avgHeight: 65,
      characteristics: 'صوف ناعم، متأقلم مع المناخ الحار'
    },
    {
      name: 'Sawakni',
      nameAr: 'سواكني',
      description: 'سلالة سودانية',
      avgWeight: 48,
      avgHeight: 64,
      characteristics: 'لون بني أو أسود، صوف قصير'
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

  console.log(`تم إضافة ${goatBreeds.length} سلالة من الماعز`)

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

  console.log(`تم إضافة ${sheepBreeds.length} سلالة من الخروف`)

  // سلالات الإبل
  const camelBreeds = [
    {
      name: 'Majaheem',
      nameAr: 'مجاهيم',
      description: 'من أشهر سلالات الإبل في الجزيرة العربية، لونها أسود داكن',
      avgWeight: 600,
      avgHeight: 190,
      characteristics: 'لون أسود، حجم كبير، إنتاج حليب عالي، تتحمل الحرارة'
    },
    {
      name: 'Safar',
      nameAr: 'صفر',
      description: 'إبل صفراء اللون منتشرة في منطقة الخليج',
      avgWeight: 550,
      avgHeight: 185,
      characteristics: 'لون أصفر فاتح، سريعة في السباقات، جسم رشيق'
    },
    {
      name: 'Hamra',
      nameAr: 'حمر',
      description: 'إبل حمراء اللون تربى في المناطق الصحراوية',
      avgWeight: 500,
      avgHeight: 180,
      characteristics: 'لون بني محمر، قوية البنية، تتحمل الظروف القاسية'
    },
    {
      name: 'Wadha',
      nameAr: 'وضح',
      description: 'إبل بيضاء نادرة ومميزة',
      avgWeight: 520,
      avgHeight: 185,
      characteristics: 'لون أبيض ناصع، نادرة، قيمة عالية في المزايين'
    },
    {
      name: 'Shaele',
      nameAr: 'شعل',
      description: 'إبل ذات لون مميز بين الأشقر والأحمر',
      avgWeight: 530,
      avgHeight: 182,
      characteristics: 'لون أشقر محمر، جميلة الشكل، سريعة'
    },
    {
      name: 'Homor',
      nameAr: 'هُمّر',
      description: 'من السلالات المعروفة في الإمارات والسعودية',
      avgWeight: 480,
      avgHeight: 178,
      characteristics: 'لون بني فاتح، متوسطة الحجم، جيدة للسباقات'
    },
    {
      name: 'Omaniyah',
      nameAr: 'عمانية',
      description: 'سلالة عمانية أصيلة متأقلمة مع بيئة الخليج',
      avgWeight: 490,
      avgHeight: 175,
      characteristics: 'قوية التحمل، هادئة الطبع، إنتاج حليب جيد'
    }
  ]

  // إضافة سلالات الإبل
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
  }

  console.log(`تم إضافة ${camelBreeds.length} سلالة من الإبل`)

  const permissions = [
    { name: 'view_goats', nameAr: 'عرض الماعز', category: 'goats', categoryAr: 'الماعز' },
    { name: 'add_goat', nameAr: 'إضافة ماعز', category: 'goats', categoryAr: 'الماعز' },
    { name: 'edit_goat', nameAr: 'تعديل ماعز', category: 'goats', categoryAr: 'الماعز' },
    { name: 'delete_goat', nameAr: 'حذف ماعز', category: 'goats', categoryAr: 'الماعز' },
    { name: 'view_pens', nameAr: 'عرض الحظائر', category: 'pens', categoryAr: 'الحظائر' },
    { name: 'add_pen', nameAr: 'إضافة حظيرة', category: 'pens', categoryAr: 'الحظائر' },
    { name: 'edit_pen', nameAr: 'تعديل حظيرة', category: 'pens', categoryAr: 'الحظائر' },
    { name: 'delete_pen', nameAr: 'حذف حظيرة', category: 'pens', categoryAr: 'الحظائر' },
    { name: 'view_health', nameAr: 'عرض السجلات الصحية', category: 'health', categoryAr: 'الصحة' },
    { name: 'add_health', nameAr: 'إضافة سجل صحي', category: 'health', categoryAr: 'الصحة' },
    { name: 'view_breeding', nameAr: 'عرض سجلات التكاثر', category: 'breeding', categoryAr: 'التكاثر' },
    { name: 'add_breeding', nameAr: 'إضافة سجل تكاثر', category: 'breeding', categoryAr: 'التكاثر' },
    { name: 'edit_breeding', nameAr: 'تعديل سجل تكاثر', category: 'breeding', categoryAr: 'التكاثر' },
    { name: 'delete_breeding', nameAr: 'حذف سجل تكاثر', category: 'breeding', categoryAr: 'التكاثر' },
    { name: 'view_sales', nameAr: 'عرض المبيعات', category: 'sales', categoryAr: 'المبيعات' },
    { name: 'add_sale', nameAr: 'إضافة بيع', category: 'sales', categoryAr: 'المبيعات' },
    { name: 'edit_sale', nameAr: 'تعديل بيع', category: 'sales', categoryAr: 'المبيعات' },
    { name: 'view_expenses', nameAr: 'عرض المصروفات', category: 'expenses', categoryAr: 'المصروفات' },
    { name: 'add_expense', nameAr: 'إضافة مصروف', category: 'expenses', categoryAr: 'المصروفات' },
    { name: 'view_reports', nameAr: 'عرض التقارير', category: 'reports', categoryAr: 'التقارير' },
    { name: 'view_activities', nameAr: 'عرض سجل النشاطات', category: 'activities', categoryAr: 'النشاطات' },
    { name: 'view_search', nameAr: 'استخدام البحث', category: 'search', categoryAr: 'البحث' },
    { name: 'view_types', nameAr: 'عرض الأنواع والسلالات', category: 'types', categoryAr: 'الأنواع والسلالات' },
    { name: 'add_type', nameAr: 'إضافة نوع', category: 'types', categoryAr: 'الأنواع والسلالات' },
    { name: 'edit_type', nameAr: 'تعديل نوع', category: 'types', categoryAr: 'الأنواع والسلالات' },
    { name: 'delete_type', nameAr: 'حذف نوع', category: 'types', categoryAr: 'الأنواع والسلالات' },
    { name: 'add_breed', nameAr: 'إضافة سلالة', category: 'types', categoryAr: 'الأنواع والسلالات' },
    { name: 'edit_breed', nameAr: 'تعديل سلالة', category: 'types', categoryAr: 'الأنواع والسلالات' },
    { name: 'delete_breed', nameAr: 'حذف سلالة', category: 'types', categoryAr: 'الأنواع والسلالات' },
    { name: 'view_users', nameAr: 'عرض المستخدمين', category: 'users', categoryAr: 'المستخدمين' },
    { name: 'add_user', nameAr: 'إضافة مستخدم', category: 'users', categoryAr: 'المستخدمين' },
    { name: 'manage_permissions', nameAr: 'إدارة الصلاحيات', category: 'permissions', categoryAr: 'الصلاحيات' },
    { name: 'view_settings', nameAr: 'عرض الإعدادات', category: 'settings', categoryAr: 'الإعدادات' },
    // صلاحيات المخزون
    { name: 'view_inventory', nameAr: 'عرض المخزون', category: 'inventory', categoryAr: 'المخزون' },
    { name: 'add_inventory', nameAr: 'إضافة صنف للمخزون', category: 'inventory', categoryAr: 'المخزون' },
    { name: 'edit_inventory', nameAr: 'تعديل المخزون', category: 'inventory', categoryAr: 'المخزون' },
    { name: 'delete_inventory', nameAr: 'حذف صنف من المخزون', category: 'inventory', categoryAr: 'المخزون' },
    { name: 'manage_inventory', nameAr: 'إدارة حركة المخزون', category: 'inventory', categoryAr: 'المخزون' },
    // صلاحيات الأعلاف
    { name: 'view_feeds', nameAr: 'عرض الأعلاف', category: 'feeds', categoryAr: 'الأعلاف' },
    { name: 'add_feed', nameAr: 'إضافة نوع علف', category: 'feeds', categoryAr: 'الأعلاف' },
    { name: 'manage_feeds', nameAr: 'إدارة مخزون الأعلاف', category: 'feeds', categoryAr: 'الأعلاف' },
    // صلاحيات التقويم
    { name: 'view_calendar', nameAr: 'عرض التقويم', category: 'calendar', categoryAr: 'التقويم' },
    { name: 'add_event', nameAr: 'إضافة حدث', category: 'calendar', categoryAr: 'التقويم' },
    { name: 'edit_event', nameAr: 'تعديل حدث', category: 'calendar', categoryAr: 'التقويم' }
  ]

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {
        nameAr: permission.nameAr,
        category: permission.category,
        categoryAr: permission.categoryAr
      },
      create: permission
    })
  }

  const adminUsers = await prisma.user.findMany({
    where: { role: 'ADMIN', isActive: true },
    select: { id: true }
  })
  const permissionIds = await prisma.permission.findMany({
    select: { id: true }
  })

  for (const admin of adminUsers) {
    await prisma.userPermission.createMany({
      data: permissionIds.map((permission) => ({
        userId: admin.id,
        permissionId: permission.id
      })),
      skipDuplicates: true
    })
  }

  console.log('تم تجهيز الصلاحيات الافتراضية وربطها بالمديرين')
  console.log('✅ تم إضافة جميع البيانات الأولية بنجاح!')
}

main()
  .catch((e) => {
    console.error('❌ خطأ في إضافة البيانات:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
