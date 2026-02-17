const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const protocols = [
  // === التطعيمات الأساسية ===
  {
    name: 'Enterotoxemia (CDT)',
    nameAr: 'التسمم المعوي',
    type: 'VACCINATION',
    ageMonths: 2,
    repeatMonths: 6,
    description: 'تطعيم ضد التسمم المعوي - من أهم التطعيمات للماعز والأغنام',
    medication: 'لقاح CDT',
    dosage: '2 مل تحت الجلد',
    gender: null,
    isActive: true,
    notes: 'جرعة تنشيطية بعد 3-4 أسابيع من الجرعة الأولى'
  },
  {
    name: 'Clostridial 8-way',
    nameAr: 'الكلوستريديا (8 سلالات)',
    type: 'VACCINATION',
    ageMonths: 2,
    repeatMonths: 12,
    description: 'تطعيم شامل ضد 8 سلالات من الكلوستريديا',
    medication: 'لقاح Covexin 8',
    dosage: '2 مل تحت الجلد',
    gender: null,
    isActive: true,
    notes: 'يغطي التسمم المعوي + الكزاز + أنواع أخرى'
  },
  {
    name: 'Pasteurella',
    nameAr: 'الباستوريلا (الالتهاب الرئوي)',
    type: 'VACCINATION',
    ageMonths: 3,
    repeatMonths: 12,
    description: 'تطعيم ضد الالتهاب الرئوي البكتيري',
    medication: 'لقاح الباستوريلا',
    dosage: '2 مل تحت الجلد',
    gender: null,
    isActive: true,
    notes: 'مهم خاصة في فترات تغير الطقس والازدحام'
  },
  {
    name: 'Brucellosis (Rev-1)',
    nameAr: 'الحمى المالطية',
    type: 'VACCINATION',
    ageMonths: 4,
    repeatMonths: null,
    description: 'تطعيم ضد الحمى المالطية - مرة واحدة للإناث فقط',
    medication: 'لقاح Rev-1',
    dosage: '1 مل تحت الجلد',
    gender: 'FEMALE',
    isActive: true,
    notes: 'يُعطى مرة واحدة فقط - للإناث غير الحوامل'
  },
  {
    name: 'Sheep/Goat Pox',
    nameAr: 'جدري الأغنام والماعز',
    type: 'VACCINATION',
    ageMonths: 3,
    repeatMonths: 12,
    description: 'تطعيم ضد جدري الأغنام والماعز',
    medication: 'لقاح حي مضعف',
    dosage: '1 مل تحت الجلد',
    gender: null,
    isActive: true,
    notes: 'يُفضل التطعيم قبل موسم الحر'
  },
  {
    name: 'Foot and Mouth Disease (FMD)',
    nameAr: 'الحمى القلاعية',
    type: 'VACCINATION',
    ageMonths: 4,
    repeatMonths: 6,
    description: 'تطعيم ضد الحمى القلاعية',
    medication: 'لقاح FMD ميت',
    dosage: '1 مل تحت الجلد',
    gender: null,
    isActive: true,
    notes: 'إلزامي في المناطق الموبوءة'
  },
  {
    name: 'Peste des Petits Ruminants (PPR)',
    nameAr: 'طاعون المجترات الصغيرة',
    type: 'VACCINATION',
    ageMonths: 4,
    repeatMonths: 36,
    description: 'تطعيم ضد طاعون المجترات الصغيرة',
    medication: 'لقاح PPR حي مضعف',
    dosage: '1 مل تحت الجلد',
    gender: null,
    isActive: true,
    notes: 'مناعة تدوم 3 سنوات تقريباً'
  },

  // === مضادات الديدان ===
  {
    name: 'Internal Deworming',
    nameAr: 'مضاد الديدان الداخلية',
    type: 'DEWORMING',
    ageMonths: 2,
    repeatMonths: 3,
    description: 'برنامج دوري لمكافحة الديدان الداخلية (المعوية والرئوية)',
    medication: 'إيفرمكتين / ألبندازول',
    dosage: '1 مل لكل 50 كجم (إيفرمكتين) أو 5 مل لكل 25 كجم (ألبندازول)',
    gender: null,
    isActive: true,
    notes: 'يُفضل التناوب بين الأدوية لتجنب المقاومة - لا يُعطى للحوامل في الثلث الأول'
  },
  {
    name: 'External Parasite Treatment',
    nameAr: 'مضاد الطفيليات الخارجية (القراد/الجرب)',
    type: 'DEWORMING',
    ageMonths: 2,
    repeatMonths: 4,
    description: 'مكافحة القراد والقمل والجرب',
    medication: 'إيفرمكتين / ديلتامثرين',
    dosage: '1 مل لكل 50 كجم (حقن) أو رش موضعي',
    gender: null,
    isActive: true,
    notes: 'فحص القطيع دورياً - العلاج الجماعي عند الإصابة'
  },
  {
    name: 'Coccidiosis Prevention',
    nameAr: 'مضاد الكوكسيديا',
    type: 'TREATMENT',
    ageMonths: 1,
    repeatMonths: null,
    description: 'وقاية الصغار من الكوكسيديا - شائعة في المواليد',
    medication: 'سلفاديميدين / تولترازوريل',
    dosage: '20 مجم/كجم (تولترازوريل جرعة واحدة)',
    gender: null,
    isActive: true,
    notes: 'يُعطى عند ظهور أعراض الإسهال - مهم جداً للصغار'
  },

  // === الفحوصات الدورية ===
  {
    name: 'General Health Checkup',
    nameAr: 'فحص صحي عام',
    type: 'CHECKUP',
    ageMonths: 0,
    repeatMonths: 6,
    description: 'فحص شامل: الوزن، درجة الحرارة، الأسنان، الأظلاف، حالة الصوف/الشعر',
    medication: null,
    dosage: null,
    gender: null,
    isActive: true,
    notes: 'تسجيل أي ملاحظات غير طبيعية للمتابعة'
  },
  {
    name: 'Pregnancy Check',
    nameAr: 'فحص الحمل',
    type: 'CHECKUP',
    ageMonths: 12,
    repeatMonths: 5,
    description: 'فحص الحمل بالسونار بعد 30-45 يوم من التلقيح',
    medication: null,
    dosage: null,
    gender: 'FEMALE',
    isActive: true,
    notes: 'للإناث البالغة - يُكرر كل موسم تكاثر'
  },
  {
    name: 'Hoof Trimming',
    nameAr: 'تقليم الأظلاف',
    type: 'CHECKUP',
    ageMonths: 6,
    repeatMonths: 3,
    description: 'تقليم وفحص الأظلاف لمنع العرج والالتهابات',
    medication: null,
    dosage: null,
    gender: null,
    isActive: true,
    notes: 'استخدام مطهر بعد التقليم - فحص علامات تعفن القدم'
  }
]

async function main() {
  console.log('🔄 إدخال البروتوكولات القياسية...\n')

  let created = 0
  let skipped = 0

  for (const p of protocols) {
    // Check if already exists
    const existing = await prisma.vaccinationProtocol.findFirst({
      where: { name: p.name }
    })

    if (existing) {
      console.log(`⏭️  موجود: ${p.nameAr}`)
      skipped++
      continue
    }

    await prisma.vaccinationProtocol.create({ data: p })
    console.log(`✅ تمت إضافة: ${p.nameAr} (${p.name})`)
    created++
  }

  console.log(`\n📊 النتيجة: ${created} بروتوكول جديد، ${skipped} موجود مسبقاً`)
  console.log(`📋 إجمالي البروتوكولات: ${await prisma.vaccinationProtocol.count()}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
