/**
 * seed-demo.js
 * إنشاء حسابَين تجريبيَّين مع بيانات كاملة
 *
 * الحساب الأول  : demo1@goatfarm.app / Demo@1234
 *   مزرعة الوحدة – مزرعة ماعز (20 رأس)
 *
 * الحساب الثاني : demo2@goatfarm.app / Demo@1234
 *   مزرعة النخيل – مزرعة خراف (30 رأس)
 *
 * تشغيل:  node prisma/seed-demo.js
 */

const mysql = require('mysql2/promise')
const bcrypt = require('bcryptjs')
const { randomUUID } = require('crypto')
require('dotenv').config()

function uuid() { return randomUUID() }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

// mysql2 returns [rows, fields] — this helper unwraps rows directly
async function q(conn, sql, params = []) {
  const [rows] = await conn.execute(sql, params)
  return rows
}

async function main() {
  console.log('🌱 بدء إنشاء الحسابات التجريبية...\n')

  const url = new URL(process.env.DATABASE_URL)
  const conn = await mysql.createConnection({
    host:     url.hostname,
    port:     parseInt(url.port || '3306'),
    user:     url.username,
    password: url.password,
    database: url.pathname.substring(1),
  })

  try {
    const hashedPassword = await bcrypt.hash('Demo@1234', 12)

    // ── Fetch global breed / type IDs ──────────────────────────────────────
    const allBreeds = await q(conn, 'SELECT id, name, typeId FROM Breed')
    const allTypes  = await q(conn, 'SELECT id, name FROM GoatType')

    const goatTypeRow  = allTypes.find(t => t.name === 'GOAT')
    const sheepTypeRow = allTypes.find(t => t.name === 'SHEEP')

    if (!goatTypeRow || !sheepTypeRow) {
      throw new Error('أنواع الحيوانات غير موجودة – شغّل seed-direct.js أولاً')
    }

    const goatBreeds  = allBreeds.filter(b => b.typeId === goatTypeRow.id)
    const sheepBreeds = allBreeds.filter(b => b.typeId === sheepTypeRow.id)

    if (!goatBreeds.length || !sheepBreeds.length) {
      throw new Error('السلالات غير موجودة – شغّل seed-direct.js أولاً')
    }

    // ── Clean up any prior demo data (idempotent re-runs) ─────────────────
    console.log('🧹 تنظيف البيانات التجريبية السابقة (إن وجدت)...')
    for (const email of ['demo1@goatfarm.app', 'demo2@goatfarm.app']) {
      const [row] = await q(conn, 'SELECT id FROM Tenant WHERE email=?', [email])
      if (row) await q(conn, 'DELETE FROM Tenant WHERE id=?', [row.id])
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DEMO 1 – مزرعة الوحدة (ماعز)
    // ═══════════════════════════════════════════════════════════════════════
    console.log('🏗️  [1/2] إنشاء مزرعة الوحدة...')

    const t1Id = uuid(); const u1Id = uuid(); const f1Id = uuid()

    await q(conn,
      `INSERT INTO Tenant (id, name, nameAr, email, phone, plan, maxFarms, maxGoats, maxUsers, isActive, createdAt, updatedAt)
       VALUES (?, 'Al Wihda Farm', 'مزرعة الوحدة', 'demo1@goatfarm.app', '+971501234501', 'PRO', 3, 200, 10, 1, NOW(), NOW())`,
      [t1Id])
    const tenant1 = t1Id

    await q(conn,
      `INSERT INTO User (id, tenantId, username, email, password, fullName, phone, role, isActive, emailVerified, createdAt, updatedAt)
       VALUES (?, ?, 'demo1', 'demo1@goatfarm.app', ?, 'أحمد الوحدة', '+971501234501', 'OWNER', 1, 1, NOW(), NOW())`,
      [u1Id, tenant1, hashedPassword])

    await q(conn,
      `INSERT INTO Farm (id, tenantId, name, nameAr, farmType, phone, address, currency, notifications, isActive, createdAt, updatedAt)
       VALUES (?, ?, 'Al Wihda Goat Farm', 'مزرعة الوحدة للماعز', 'GOAT', '+971501234501', 'العين، أبوظبي', 'AED', 1, 1, NOW(), NOW())`,
      [f1Id, tenant1])
    const farm1 = f1Id

    await q(conn,
      `INSERT INTO UserFarm (id, userId, farmId, role) VALUES (UUID(), ?, ?, 'OWNER')`,
      [u1Id, farm1])

    // Pens
    const pen1aId = uuid(); const pen1bId = uuid(); const pen1cId = uuid()
    await q(conn,
      `INSERT IGNORE INTO Pen (id, tenantId, farmId, name, nameAr, capacity, type, createdAt, updatedAt) VALUES
       (?, ?, ?, 'Pen A - Does',  'حظيرة أ - الإناث', 20, 'FEMALE', NOW(), NOW()),
       (?, ?, ?, 'Pen B - Bucks', 'حظيرة ب - الذكور', 10, 'MALE',   NOW(), NOW()),
       (?, ?, ?, 'Pen C - Kids',  'حظيرة ج - الصغار', 15, 'KIDS',   NOW(), NOW())`,
      [pen1aId, tenant1, farm1, pen1bId, tenant1, farm1, pen1cId, tenant1, farm1])

    // Owner
    await q(conn,
      `INSERT IGNORE INTO Owner (id, tenantId, farmId, name, phone, idNumber, address, isActive, createdAt, updatedAt)
       VALUES (UUID(), ?, ?, 'أحمد الوحدة', '+971501234501', '784-1985-1234567-1', 'العين، أبوظبي', 1, NOW(), NOW())`,
      [tenant1, farm1])
    const [ow1] = await q(conn, `SELECT id FROM Owner WHERE farmId=? LIMIT 1`, [farm1])
    const owner1 = ow1.id

    // 20 Goats
    const goatData = [
      //  tagId    name       gender     birthDays  weight  penId
      ['G001', 'هيفاء',   'FEMALE', 900, 42, pen1aId],
      ['G002', 'لولو',    'FEMALE', 850, 38, pen1aId],
      ['G003', 'وردة',    'FEMALE', 780, 40, pen1aId],
      ['G004', 'سمراء',   'FEMALE', 720, 37, pen1aId],
      ['G005', 'بيضاء',   'FEMALE', 650, 35, pen1aId],
      ['G006', 'نجمة',    'FEMALE', 600, 36, pen1aId],
      ['G007', 'ريم',     'FEMALE', 540, 33, pen1aId],
      ['G008', 'غزلان',   'FEMALE', 480, 32, pen1aId],
      ['G009', 'روضة',    'FEMALE', 400, 30, pen1aId],
      ['G010', 'زهرة',    'FEMALE', 360, 29, pen1aId],
      ['G011', 'ماجد',    'MALE',   950, 65, pen1bId],
      ['G012', 'سلطان',   'MALE',   880, 60, pen1bId],
      ['G013', 'نمر',     'MALE',   750, 55, pen1bId],
      ['G014', 'عقاب',    'MALE',   600, 50, pen1bId],
      ['G015', 'برق',     'MALE',   520, 48, pen1bId],
      ['G016', 'لقلق',    'MALE',    90, 12, pen1cId],
      ['G017', 'قمر',     'FEMALE',  85, 10, pen1cId],
      ['G018', 'بدر',     'MALE',    75, 11, pen1cId],
      ['G019', 'سحر',     'FEMALE',  60,  9, pen1cId],
      ['G020', 'فجر',     'FEMALE',  50,  8, pen1cId],
    ]

    for (const [tagId, name, gender, birthDays, weight, penId] of goatData) {
      const gId = uuid()
      const breedId = pick(goatBreeds).id
      await q(conn,
        `INSERT IGNORE INTO Goat (id, tenantId, farmId, tagId, name, breedId, gender, birthDate, weight, status, penId, ownerId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), ?, 'ACTIVE', ?, ?, NOW(), NOW())`,
        [gId, tenant1, farm1, tagId, name, breedId, gender, birthDays, weight, penId, owner1])
    }

    const farm1Goats = await q(conn, `SELECT id, gender FROM Goat WHERE farmId=?`, [farm1])
    const males1   = farm1Goats.filter(g => g.gender === 'MALE')
    const females1 = farm1Goats.filter(g => g.gender === 'FEMALE')

    // 15 Health records
    for (let i = 0; i < 15; i++) {
      const g = pick(farm1Goats)
      const hType = pick(['VACCINATION', 'VACCINATION', 'TREATMENT', 'CHECKUP'])
      const desc = hType === 'VACCINATION' ? 'تطعيم ضد مرض الحمى القلاعية - الجرعة السنوية'
                 : hType === 'TREATMENT'   ? 'علاج من التهاب الجهاز التنفسي، مضادات حيوية'
                 : 'فحص دوري روتيني وقياس الوزن'
      const med  = hType === 'VACCINATION' ? 'لقاح FMD' : hType === 'TREATMENT' ? 'أموكسيسيلين 500mg' : null
      const cost = hType === 'VACCINATION' ? 25 : hType === 'TREATMENT' ? 80 : 30
      await q(conn,
        `INSERT INTO HealthRecord (id, tenantId, farmId, goatId, type, date, description, veterinarian, medication, cost, createdAt, updatedAt)
         VALUES (UUID(), ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), ?, 'د. محمد الزعابي', ?, ?, NOW(), NOW())`,
        [tenant1, farm1, g.id, hType, rand(1, 90), desc, med, cost])
    }

    // 5 Sales
    const sellable1 = [...males1, ...females1.slice(0, 2)]
    const sales1 = [
      ['محمد بن خلفان',    '+971551234001', 1200, 'PAID',    35],
      ['سعيد الكتبي',      '+971551234002',  950, 'PAID',    50],
      ['خالد العامري',     '+971551234003', 1400, 'PARTIAL', 15],
      ['راشد الشامسي',     '+971551234004',  800, 'PENDING',  5],
      ['عبدالله المنصوري', '+971551234005', 1100, 'PAID',    60],
    ]
    for (let i = 0; i < sales1.length; i++) {
      const [buyer, phone, price, payStatus, daysBack] = sales1[i]
      const goat = sellable1[i % sellable1.length]
      if (!goat) continue
      const sId = uuid()
      await q(conn,
        `INSERT INTO Sale (id, tenantId, farmId, goatId, date, buyerName, buyerPhone, salePrice, paymentStatus, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), ?, ?, ?, ?, NOW(), NOW())`,
        [sId, tenant1, farm1, goat.id, daysBack, buyer, phone, price, payStatus])
      if (payStatus === 'PAID') {
        await q(conn,
          `INSERT INTO Payment (id, tenantId, saleId, amount, paymentDate, paymentMethod, createdAt, updatedAt)
           VALUES (UUID(), ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), 'CASH', NOW(), NOW())`,
          [tenant1, sId, price, daysBack])
      } else if (payStatus === 'PARTIAL') {
        await q(conn,
          `INSERT INTO Payment (id, tenantId, saleId, amount, paymentDate, paymentMethod, createdAt, updatedAt)
           VALUES (UUID(), ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), 'CASH', NOW(), NOW())`,
          [tenant1, sId, Math.round(price / 2), daysBack])
      }
    }

    // Expenses
    const exp1 = [
      ['FEED',        'علف برسيم',        350,  30],
      ['VETERINARY',  'تطعيمات دورية',    200,  20],
      ['FEED',        'علف شعير',         180,  15],
      ['MAINTENANCE', 'صيانة الحظيرة',    400,  10],
      ['UTILITIES',   'فاتورة كهرباء',    120,   5],
      ['LABOR',       'راتب العامل',     1200,   1],
    ]
    for (const [cat, desc, amount, daysBack] of exp1) {
      await q(conn,
        `INSERT INTO Expense (id, tenantId, farmId, category, description, amount, date, paymentMethod, createdAt, updatedAt)
         VALUES (UUID(), ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), 'CASH', NOW(), NOW())`,
        [tenant1, farm1, cat, desc, amount, daysBack])
    }

    // Feed types + stock
    const ft1a = uuid(); const ft1b = uuid()
    await q(conn,
      `INSERT IGNORE INTO FeedType (id, tenantId, farmId, name, nameAr, category, unitPrice, createdAt, updatedAt)
       VALUES (?, ?, ?, 'Barley', 'شعير', 'GRAINS', 2.5, NOW(), NOW()),
              (?, ?, ?, 'Clover', 'برسيم', 'HAY',    1.8, NOW(), NOW())`,
      [ft1a, tenant1, farm1, ft1b, tenant1, farm1])
    const fts1 = await q(conn, `SELECT id FROM FeedType WHERE farmId=?`, [farm1])
    for (const ft of fts1) {
      await q(conn,
        `INSERT IGNORE INTO FeedStock (id, tenantId, farmId, feedTypeId, quantity, unit, purchaseDate, createdAt, updatedAt)
         VALUES (UUID(), ?, ?, ?, ?, 'كجم', CURDATE(), NOW(), NOW())`,
        [tenant1, farm1, ft.id, rand(100, 300)])
    }

    // 1 Breeding record
    if (females1.length && males1.length) {
      await q(conn,
        `INSERT INTO Breeding (id, tenantId, farmId, motherId, fatherId, matingDate, pregnancyStatus, dueDate, createdAt, updatedAt)
         VALUES (UUID(), ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL 60 DAY), 'PREGNANT', DATE_ADD(NOW(), INTERVAL 90 DAY), NOW(), NOW())`,
        [tenant1, farm1, females1[0].id, males1[0].id])
    }

    console.log('✅ تم إنشاء مزرعة الوحدة  — 20 رأس ماعز، 5 مبيعات، 15 سجل صحي، 6 مصروفات\n')

    // ═══════════════════════════════════════════════════════════════════════
    // DEMO 2 – مزرعة النخيل (خراف)
    // ═══════════════════════════════════════════════════════════════════════
    console.log('🏗️  [2/2] إنشاء مزرعة النخيل...')

    const t2Id = uuid(); const u2Id = uuid(); const f2Id = uuid()

    await q(conn,
      `INSERT INTO Tenant (id, name, nameAr, email, phone, plan, maxFarms, maxGoats, maxUsers, isActive, createdAt, updatedAt)
       VALUES (?, 'Al Nakhal Farm', 'مزرعة النخيل', 'demo2@goatfarm.app', '+971501234502', 'PRO', 3, 200, 10, 1, NOW(), NOW())`,
      [t2Id])
    const tenant2 = t2Id

    await q(conn,
      `INSERT INTO User (id, tenantId, username, email, password, fullName, phone, role, isActive, emailVerified, createdAt, updatedAt)
       VALUES (?, ?, 'demo2', 'demo2@goatfarm.app', ?, 'سلطان النخيل', '+971501234502', 'OWNER', 1, 1, NOW(), NOW())`,
      [u2Id, tenant2, hashedPassword])

    await q(conn,
      `INSERT INTO Farm (id, tenantId, name, nameAr, farmType, phone, address, currency, notifications, isActive, createdAt, updatedAt)
       VALUES (?, ?, 'Al Nakhal Sheep Farm', 'مزرعة النخيل للأغنام', 'SHEEP', '+971501234502', 'أبوظبي', 'AED', 1, 1, NOW(), NOW())`,
      [f2Id, tenant2])
    const farm2 = f2Id

    await q(conn,
      `INSERT INTO UserFarm (id, userId, farmId, role) VALUES (UUID(), ?, ?, 'OWNER')`,
      [u2Id, farm2])

    // Pens
    const pen2aId = uuid(); const pen2bId = uuid(); const pen2cId = uuid(); const pen2dId = uuid()
    await q(conn,
      `INSERT IGNORE INTO Pen (id, tenantId, farmId, name, nameAr, capacity, type, createdAt, updatedAt) VALUES
       (?, ?, ?, 'Pen 1 - Ewes',       'حظيرة 1 - النعاج',       25, 'FEMALE',    NOW(), NOW()),
       (?, ?, ?, 'Pen 2 - Rams',       'حظيرة 2 - الكباش',        8, 'MALE',      NOW(), NOW()),
       (?, ?, ?, 'Pen 3 - Lambs',      'حظيرة 3 - الحملان',      15, 'KIDS',      NOW(), NOW()),
       (?, ?, ?, 'Pen 4 - Quarantine', 'حظيرة 4 - الحجر الصحي',   5, 'ISOLATION', NOW(), NOW())`,
      [pen2aId, tenant2, farm2, pen2bId, tenant2, farm2, pen2cId, tenant2, farm2, pen2dId, tenant2, farm2])

    // Owner
    await q(conn,
      `INSERT IGNORE INTO Owner (id, tenantId, farmId, name, phone, idNumber, address, isActive, createdAt, updatedAt)
       VALUES (UUID(), ?, ?, 'سلطان النخيل', '+971501234502', '784-1990-7654321-1', 'أبوظبي', 1, NOW(), NOW())`,
      [tenant2, farm2])
    const [ow2] = await q(conn, `SELECT id FROM Owner WHERE farmId=? LIMIT 1`, [farm2])
    const owner2 = ow2.id

    // 30 Sheep
    const sheepGoatData = [
      ['S001', 'لولو',      'FEMALE', 800, 45, pen2aId],
      ['S002', 'سمراء',     'FEMALE', 750, 42, pen2aId],
      ['S003', 'بيضاء',     'FEMALE', 700, 40, pen2aId],
      ['S004', 'لطيفة',     'FEMALE', 680, 38, pen2aId],
      ['S005', 'هناء',      'FEMALE', 600, 37, pen2aId],
      ['S006', 'مريم',      'FEMALE', 560, 36, pen2aId],
      ['S007', 'عائشة',     'FEMALE', 520, 35, pen2aId],
      ['S008', 'فاطمة',     'FEMALE', 480, 34, pen2aId],
      ['S009', 'خديجة',     'FEMALE', 430, 33, pen2aId],
      ['S010', 'زينب',      'FEMALE', 400, 32, pen2aId],
      ['S011', 'أسماء',     'FEMALE', 380, 31, pen2aId],
      ['S012', 'رقية',      'FEMALE', 350, 30, pen2aId],
      ['S013', 'أم كلثوم',  'FEMALE', 330, 29, pen2aId],
      ['S014', 'حفصة',      'FEMALE', 310, 28, pen2aId],
      ['S015', 'صفية',      'FEMALE', 290, 27, pen2aId],
      ['S016', 'طارق',      'MALE',   900, 70, pen2bId],
      ['S017', 'عمر',       'MALE',   850, 68, pen2bId],
      ['S018', 'علي',       'MALE',   800, 65, pen2bId],
      ['S019', 'حسن',       'MALE',   750, 62, pen2bId],
      ['S020', 'حسين',      'MALE',   700, 60, pen2bId],
      ['S021', 'خالد',      'MALE',   650, 58, pen2bId],
      ['S022', 'وليد',      'MALE',   600, 55, pen2bId],
      ['S023', 'مفيد',      'MALE',   550, 52, pen2bId],
      ['S024', 'حمدان',     'MALE',    80, 10, pen2cId],
      ['S025', 'زياد',      'MALE',    70,  9, pen2cId],
      ['S026', 'ميثاء',     'FEMALE',  65,  8, pen2cId],
      ['S027', 'شما',       'FEMALE',  55,  7, pen2cId],
      ['S028', 'لنا',       'FEMALE',  45,  6, pen2cId],
      ['S029', 'رنا',       'FEMALE',  38,  6, pen2cId],
      ['S030', 'دانة',      'FEMALE',  30,  5, pen2dId],
    ]

    for (const [tagId, name, gender, birthDays, weight, penId] of sheepGoatData) {
      const gId = uuid()
      const breedId = pick(sheepBreeds).id
      await q(conn,
        `INSERT IGNORE INTO Goat (id, tenantId, farmId, tagId, name, breedId, gender, birthDate, weight, status, penId, ownerId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), ?, 'ACTIVE', ?, ?, NOW(), NOW())`,
        [gId, tenant2, farm2, tagId, name, breedId, gender, birthDays, weight, penId, owner2])
    }

    const farm2Goats = await q(conn, `SELECT id, gender FROM Goat WHERE farmId=?`, [farm2])
    const ewes2 = farm2Goats.filter(g => g.gender === 'FEMALE')
    const rams2 = farm2Goats.filter(g => g.gender === 'MALE')

    // 20 Health records
    for (let i = 0; i < 20; i++) {
      const g = pick(farm2Goats)
      const hType = pick(['VACCINATION', 'VACCINATION', 'TREATMENT', 'CHECKUP'])
      const desc = hType === 'VACCINATION' ? 'تطعيم بروسيلا - جرعة وقائية سنوية'
                 : hType === 'TREATMENT'   ? 'علاج داء الطفيليات الداخلية'
                 : 'متابعة الحمل وقياس الوزن الدوري'
      const med  = hType === 'VACCINATION' ? 'لقاح بروسيلا Rev1' : hType === 'TREATMENT' ? 'إيفرمكتين' : null
      const cost = hType === 'VACCINATION' ? 30 : hType === 'TREATMENT' ? 60 : 20
      await q(conn,
        `INSERT INTO HealthRecord (id, tenantId, farmId, goatId, type, date, description, veterinarian, medication, cost, nextDueDate, createdAt, updatedAt)
         VALUES (UUID(), ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), ?, 'د. صالح المطيري', ?, ?, DATE_ADD(NOW(), INTERVAL 365 DAY), NOW(), NOW())`,
        [tenant2, farm2, g.id, hType, rand(1, 120), desc, med, cost])
    }

    // 8 Sales
    const sellable2 = [...rams2.slice(0, 5), ...ewes2.slice(0, 3)]
    const sales2 = [
      ['عيسى الكعبي',       '+971551235001', 1800, 'PAID',    70],
      ['يوسف الفلاسي',      '+971551235002', 1600, 'PAID',    55],
      ['ناصر الظاهري',      '+971551235003', 2100, 'PAID',    40],
      ['مبارك الدرعي',      '+971551235004', 1400, 'PARTIAL', 25],
      ['حمد الرميثي',       '+971551235005', 1900, 'PAID',    20],
      ['سالم النعيمي',      '+971551235006', 1200, 'PENDING', 10],
      ['علي الهاملي',       '+971551235007', 2500, 'PAID',     5],
      ['محمد الجابري',      '+971551235008', 1700, 'PARTIAL',  2],
    ]
    for (let i = 0; i < sales2.length; i++) {
      const [buyer, phone, price, payStatus, daysBack] = sales2[i]
      const goat = sellable2[i % sellable2.length]
      if (!goat) continue
      const sId = uuid()
      await q(conn,
        `INSERT INTO Sale (id, tenantId, farmId, goatId, date, buyerName, buyerPhone, salePrice, paymentStatus, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), ?, ?, ?, ?, NOW(), NOW())`,
        [sId, tenant2, farm2, goat.id, daysBack, buyer, phone, price, payStatus])
      if (payStatus === 'PAID') {
        await q(conn,
          `INSERT INTO Payment (id, tenantId, saleId, amount, paymentDate, paymentMethod, createdAt, updatedAt)
           VALUES (UUID(), ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), 'TRANSFER', NOW(), NOW())`,
          [tenant2, sId, price, daysBack])
      } else if (payStatus === 'PARTIAL') {
        await q(conn,
          `INSERT INTO Payment (id, tenantId, saleId, amount, paymentDate, paymentMethod, createdAt, updatedAt)
           VALUES (UUID(), ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), 'CASH', NOW(), NOW())`,
          [tenant2, sId, Math.round(price * 0.5), daysBack])
      }
    }

    // Expenses
    const exp2 = [
      ['FEED',        'علف أوميجا للأغنام',   600, 45],
      ['VETERINARY',  'تطعيمات برنامج الصحة', 350, 35],
      ['FEED',        'تبن جافة',              250, 28],
      ['FEED',        'كسبة صويا',             400, 20],
      ['MAINTENANCE', 'إصلاح سياج الحظيرة',   800, 12],
      ['UTILITIES',   'فاتورة ماء وكهرباء',    220,  8],
      ['LABOR',       'راتب العمال (شخصان)',  2400,  1],
      ['EQUIPMENT',   'شراء معدات تشليح',      550,  3],
    ]
    for (const [cat, desc, amount, daysBack] of exp2) {
      await q(conn,
        `INSERT INTO Expense (id, tenantId, farmId, category, description, amount, date, paymentMethod, createdAt, updatedAt)
         VALUES (UUID(), ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), 'CASH', NOW(), NOW())`,
        [tenant2, farm2, cat, desc, amount, daysBack])
    }

    // Feed types + stock
    const ft2a = uuid(); const ft2b = uuid(); const ft2c = uuid()
    await q(conn,
      `INSERT IGNORE INTO FeedType (id, tenantId, farmId, name, nameAr, category, unitPrice, createdAt, updatedAt)
       VALUES (?, ?, ?, 'Omega Sheep Feed', 'علف أوميجا', 'CONCENTRATE', 3.2, NOW(), NOW()),
              (?, ?, ?, 'Hay',              'تبن',         'HAY',         1.2, NOW(), NOW()),
              (?, ?, ?, 'Soybean Meal',     'كسبة صويا',   'CONCENTRATE', 2.8, NOW(), NOW())`,
      [ft2a, tenant2, farm2, ft2b, tenant2, farm2, ft2c, tenant2, farm2])
    const fts2 = await q(conn, `SELECT id FROM FeedType WHERE farmId=?`, [farm2])
    for (const ft of fts2) {
      await q(conn,
        `INSERT IGNORE INTO FeedStock (id, tenantId, farmId, feedTypeId, quantity, unit, purchaseDate, createdAt, updatedAt)
         VALUES (UUID(), ?, ?, ?, ?, 'كجم', CURDATE(), NOW(), NOW())`,
        [tenant2, farm2, ft.id, rand(150, 400)])
    }

    // 3 Breeding records
    if (ewes2.length >= 3 && rams2.length >= 1) {
      const pairs = [
        [ewes2[0].id, rams2[0].id,                   90, 'PREGNANT',  60],
        [ewes2[1].id, rams2[0].id,                   60, 'PREGNANT',  90],
        [ewes2[2].id, (rams2[1] || rams2[0]).id,     30, 'MATED',    120],
      ]
      for (const [mId, fId, matingDays, status, due] of pairs) {
        await q(conn,
          `INSERT INTO Breeding (id, tenantId, farmId, motherId, fatherId, matingDate, pregnancyStatus, dueDate, createdAt, updatedAt)
           VALUES (UUID(), ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), ?, DATE_ADD(NOW(), INTERVAL ? DAY), NOW(), NOW())`,
          [tenant2, farm2, mId, fId, matingDays, status, due])
      }
    }

    console.log('✅ تم إنشاء مزرعة النخيل   — 30 رأس خراف، 8 مبيعات، 20 سجل صحي، 8 مصروفات\n')

    // ─── Summary ────────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════════')
    console.log('🎉  الحسابات التجريبية جاهزة!\n')
    console.log('  📧  demo1@goatfarm.app  |  🔑  Demo@1234')
    console.log('      مزرعة الوحدة للماعز — 20 رأس ماعز\n')
    console.log('  📧  demo2@goatfarm.app  |  🔑  Demo@1234')
    console.log('      مزرعة النخيل للأغنام — 30 رأس خروف')
    console.log('═══════════════════════════════════════════════════════')

  } finally {
    await conn.end()
  }
}

main().catch(e => {
  console.error('❌ فشل:', e.message)
  process.exit(1)
})
