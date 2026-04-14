import cron from 'node-cron'

const cronSecret = process.env.FEEDS_CRON_SECRET || process.env.CRON_SECRET
const baseUrl =
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3000'

if (!cronSecret) {
  console.error('[feeds-cron] FEEDS_CRON_SECRET or CRON_SECRET is required')
  process.exit(1)
}

const triggerDailyConsumption = async () => {
  const today = new Date().toISOString().slice(0, 10)
  console.log(`[feeds-cron] Trigger started for ${today}`)

  try {
    const response = await fetch(`${baseUrl}/api/cron/feeds-consume`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-cron-secret': cronSecret,
      },
      cache: 'no-store',
    })

    const data = await response.json().catch(() => ({}))
    if (response.ok) {
      console.log('[feeds-cron] Trigger succeeded:', {
        farmsProcessed: data.farmsProcessed,
        succeeded: data.succeeded,
        failed: data.failed,
      })
    } else {
      console.error('[feeds-cron] Trigger failed:', response.status, data)
    }
  } catch (error) {
    console.error('[feeds-cron] Request error:', error)
  }
}

// Daily at 00:05 server time.
cron.schedule('5 0 * * *', triggerDailyConsumption)

console.log('[feeds-cron] Worker is running')
console.log(`[feeds-cron] Base URL: ${baseUrl}`)
console.log('[feeds-cron] Schedule: 5 0 * * *')

// Optional manual run when deploying/testing.
if (process.env.FEEDS_CRON_RUN_ON_START === '1') {
  void triggerDailyConsumption()
}
