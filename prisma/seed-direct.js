const mariadb = require('mariadb')
require('dotenv').config()

async function main() {
  console.log('🌱 بدء إضافة البيانات الأولية...')
  
  const url = new URL(process.env.DATABASE_URL)
  const conn = await mariadb.createConnection({
    host: url.hostname,
    port: parseInt(url.port || '3306'),
    user: url.username,
    password: url.password,
    database: url.pathname.substring(1)
  })

  try {
    // إنشاء نوع الماعز
    const goatResult = await conn.query(
      "INSERT INTO GoatType (id, name, nameAr, description, createdAt, updatedAt) VALUES (UUID(), 'GOAT', 'ماعز', 'الماعز حيوان ثديي يربى للحصول على اللحوم والحليب', NOW(), NOW()) ON DUPLICATE KEY UPDATE id=id"
    )
    
    // إنشاء نوع الخروف
    await conn.query(
      "INSERT INTO GoatType (id, name, nameAr, description, createdAt, updatedAt) VALUES (UUID(), 'SHEEP', 'خروف', 'الخروف حيوان ثديي يربى للحصول على اللحوم والصوف', NOW(), NOW()) ON DUPLICATE KEY UPDATE id=id"
    )

    console.log('✅ تم إنشاء الأنواع')

    // Get type IDs
    const types = await conn.query("SELECT id, name FROM GoatType")
    const goatTypeId = types.find(t => t.name === 'GOAT').id
    const sheepTypeId = types.find(t => t.name === 'SHEEP').id

    // سلالات الماعز
    const goatBreeds = [
      ['Damascus', 'شامي', 'ماعز الشام أو الدمشقي، من أشهر سلالات الماعز في المنطقة', 70, 80, 'آذان طويلة متدلية، أنف محدب، إنتاج حليب عالي'],
      ['Nubian', 'نوبي', 'الماعز النوبي من السلالات المتميزة في إنتاج الحليب', 65, 75, 'آذان طويلة، أنف روماني، ألوان متعددة'],
      ['Aradi', 'عارضي', 'من السلالات المحلية في الجزيرة العربية', 45, 65, 'متأقلم مع البيئة الصحراوية، مقاوم للحرارة'],
      ['Najdi', 'نجدي', 'سلالة محلية من منطقة نجد', 50, 70, 'قوي البنية، متحمل للظروف القاسية'],
      ['Boer', 'بور', 'سلالة جنوب أفريقية متخصصة في إنتاج اللحم', 85, 85, 'رأس بني وجسم أبيض، نمو سريع، لحم عالي الجودة']
    ]

    for (const [name, nameAr, desc, weight, height, chars] of goatBreeds) {
      await conn.query(
        "INSERT INTO Breed (id, typeId, name, nameAr, description, avgWeight, avgHeight, characteristics, createdAt, updatedAt) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE id=id",
        [goatTypeId, name, nameAr, desc, weight, height, chars]
      )
    }

    console.log(`✅ تم إضافة ${goatBreeds.length} سلالة من الماعز`)

    // سلالات الخروف
    const sheepBreeds = [
      ['Naimi', 'نعيمي', 'من أشهر سلالات الأغنام في الإمارات والخليج', 60, 70, 'ذيل دهني كبير، صوف خشن، لون أبيض أو بني'],
      ['Awassi', 'عواسي', 'سلالة شامية منتشرة في المشرق العربي', 65, 75, 'ذيل دهني، آذان متدلية، إنتاج حليب جيد'],
      ['Harri', 'حري', 'سلالة محلية من المناطق الجبلية', 45, 65, 'متوسط الحجم، قوي، متحمل للظروف القاسية'],
      ['Najdi', 'نجدي', 'سلالة محلية من منطقة نجد', 55, 68, 'لون أسود في الرأس والأطراف، جسم أبيض']
    ]

    for (const [name, nameAr, desc, weight, height, chars] of sheepBreeds) {
      await conn.query(
        "INSERT INTO Breed (id, typeId, name, nameAr, description, avgWeight, avgHeight, characteristics, createdAt, updatedAt) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE id=id",
        [sheepTypeId, name, nameAr, desc, weight, height, chars]
      )
    }

    console.log(`✅ تم إضافة ${sheepBreeds.length} سلالة من الخروف`)
    console.log('✅ تم إضافة جميع البيانات الأولية بنجاح!')

  } catch (error) {
    console.error('❌ خطأ:', error)
    throw error
  } finally {
    await conn.end()
  }
}

main()
  .catch((e) => {
    console.error('❌ فشل:', e.message)
    process.exit(1)
  })
