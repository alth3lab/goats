const mariadb = require('mariadb')
const bcrypt = require('bcryptjs')
require('dotenv').config()

async function main() {
  const url = new URL(process.env.DATABASE_URL)
  const conn = await mariadb.createConnection({
    host: url.hostname,
    port: parseInt(url.port || '3306', 10),
    user: url.username,
    password: url.password,
    database: url.pathname.substring(1)
  })

  const email = process.env.ADMIN_EMAIL || '6111139@gmail.com'
  const fullName = process.env.ADMIN_NAME || 'سهيل الخييلي'
  const username = process.env.ADMIN_USERNAME || 'suhail'
  const password = process.env.ADMIN_PASSWORD
  if (!password) {
    console.error('❌ ADMIN_PASSWORD environment variable is required')
    process.exit(1)
  }
  const hashed = await bcrypt.hash(password, 12)

  try {
    const existing = await conn.query('SELECT id FROM User WHERE email = ? LIMIT 1', [email])
    if (existing.length > 0) {
      await conn.query(
        'UPDATE User SET fullName = ?, username = ?, password = ?, role = ?, isActive = 1, updatedAt = NOW() WHERE email = ?',
        [fullName, username, hashed, 'ADMIN', email]
      )
      console.log('✅ تم تحديث حساب المدير')
    } else {
      await conn.query(
        'INSERT INTO User (id, username, email, password, fullName, role, isActive, createdAt, updatedAt) VALUES (UUID(), ?, ?, ?, ?, ?, 1, NOW(), NOW())',
        [username, email, hashed, fullName, 'ADMIN']
      )
      console.log('✅ تم إنشاء حساب المدير')
    }
  } finally {
    await conn.end()
  }
}

main().catch((e) => {
  console.error('❌ فشل إنشاء المدير:', e)
  process.exit(1)
})
