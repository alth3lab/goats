// Backfill empty farmId in FeedStock, DailyFeedConsumption, FeedingRecord
// Run before prisma db push to ensure FK constraints pass
const mysql = require('mysql2/promise')
require('dotenv').config()

async function main() {
  const url = new URL(process.env.DATABASE_URL)
  const conn = await mysql.createConnection({
    host: url.hostname,
    port: url.port || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: false }
  })

  console.log('🔍 Checking for empty farmId values...\n')

  // Tables to fix
  const tables = ['FeedStock', 'DailyFeedConsumption', 'FeedingRecord']
  
  for (const table of tables) {
    const [rows] = await conn.query(`SELECT COUNT(*) as cnt FROM \`${table}\` WHERE farmId = '' OR farmId IS NULL`)
    const count = rows[0].cnt
    
    if (count > 0) {
      console.log(`⚠️  ${table}: ${count} records with empty farmId`)
      
      // Try to backfill from FeedType's farmId (FeedStock and DailyFeedConsumption have feedTypeId)
      if (table === 'FeedStock' || table === 'DailyFeedConsumption') {
        const [result] = await conn.query(`
          UPDATE \`${table}\` t
          JOIN FeedType ft ON t.feedTypeId = ft.id
          SET t.farmId = ft.farmId
          WHERE (t.farmId = '' OR t.farmId IS NULL) AND ft.farmId != ''
        `)
        console.log(`   ✅ Updated ${result.affectedRows} records from FeedType.farmId`)
      }
      
      // For FeedingRecord, try from goat's farmId or fallback to first farm
      if (table === 'FeedingRecord') {
        // Try from Goat
        const [r1] = await conn.query(`
          UPDATE \`${table}\` t
          JOIN Goat g ON t.goatId = g.id
          SET t.farmId = g.farmId
          WHERE (t.farmId = '' OR t.farmId IS NULL) AND g.farmId != ''
        `)
        console.log(`   ✅ Updated ${r1.affectedRows} records from Goat.farmId`)
        
        // Try from FeedType if feedTypeId
        const [r2] = await conn.query(`
          UPDATE \`${table}\` t
          JOIN FeedType ft ON t.feedTypeId = ft.id
          SET t.farmId = ft.farmId
          WHERE (t.farmId = '' OR t.farmId IS NULL) AND ft.farmId != ''
        `)
        console.log(`   ✅ Updated ${r2.affectedRows} records from FeedType.farmId`)
      }
      
      // Check remaining
      const [remaining] = await conn.query(`SELECT COUNT(*) as cnt FROM \`${table}\` WHERE farmId = '' OR farmId IS NULL`)
      if (remaining[0].cnt > 0) {
        // Fallback: use first farm
        const [farms] = await conn.query(`SELECT id FROM Farm LIMIT 1`)
        if (farms.length > 0) {
          const fallbackFarmId = farms[0].id
          const [r3] = await conn.query(`UPDATE \`${table}\` SET farmId = ? WHERE farmId = '' OR farmId IS NULL`, [fallbackFarmId])
          console.log(`   ✅ Updated ${r3.affectedRows} remaining records with fallback farm ${fallbackFarmId}`)
        }
      }
    } else {
      console.log(`✅ ${table}: All records have valid farmId`)
    }
  }

  // Also check tenantId
  console.log('\n🔍 Checking for empty tenantId values...')
  for (const table of tables) {
    const [rows] = await conn.query(`SELECT COUNT(*) as cnt FROM \`${table}\` WHERE tenantId = '' OR tenantId IS NULL`)
    if (rows[0].cnt > 0) {
      const [tenants] = await conn.query(`SELECT id FROM Tenant LIMIT 1`)
      if (tenants.length > 0) {
        const [r] = await conn.query(`UPDATE \`${table}\` SET tenantId = ? WHERE tenantId = '' OR tenantId IS NULL`, [tenants[0].id])
        console.log(`   ✅ ${table}: Updated ${r.affectedRows} records with tenant ${tenants[0].id}`)
      }
    } else {
      console.log(`✅ ${table}: All records have valid tenantId`)
    }
  }

  // Verify DailyFeedConsumption unique constraint won't conflict
  console.log('\n🔍 Checking for potential unique constraint conflicts...')
  const [dupes] = await conn.query(`
    SELECT tenantId, date, feedTypeId, penId, COUNT(*) as cnt 
    FROM DailyFeedConsumption 
    GROUP BY tenantId, date, feedTypeId, penId 
    HAVING cnt > 1
  `)
  if (dupes.length > 0) {
    console.log(`⚠️  Found ${dupes.length} duplicate groups - deduplicating...`)
    for (const dupe of dupes) {
      const [records] = await conn.query(
        `SELECT id FROM DailyFeedConsumption WHERE tenantId = ? AND date = ? AND feedTypeId = ? AND (penId = ? OR (penId IS NULL AND ? IS NULL)) ORDER BY createdAt DESC`,
        [dupe.tenantId, dupe.date, dupe.feedTypeId, dupe.penId, dupe.penId]
      )
      // Keep the newest, delete the rest
      const idsToDelete = records.slice(1).map(r => r.id)
      if (idsToDelete.length > 0) {
        await conn.query(`DELETE FROM DailyFeedConsumption WHERE id IN (?)`, [idsToDelete])
        console.log(`   Removed ${idsToDelete.length} duplicate records`)
      }
    }
  } else {
    console.log('✅ No duplicate conflicts found')
  }

  console.log('\n✅ Backfill complete!')
  await conn.end()
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1) })
