import cron from 'node-cron'

let scheduled = false

export function scheduleFeedsCron() {
  if (scheduled) return
  scheduled = true

  const secret = process.env.FEEDS_CRON_SECRET || process.env.CRON_SECRET
  if (!secret) {
    console.warn('[cron] FEEDS_CRON_SECRET not set — feed cron disabled')
    return
  }

  const baseUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    `http://localhost:${process.env.PORT || 3000}`

  // Run daily at 00:05 (server time)
  cron.schedule('5 0 * * *', async () => {
    console.log(`[cron] Running daily feed consumption at ${new Date().toISOString()}`)
    try {
      const res = await fetch(`${baseUrl}/api/cron/feeds-consume`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-cron-secret': secret,
        },
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        console.log(`[cron] Feed consumption completed: ${data.succeeded}/${data.farmsProcessed} farms succeeded`)
      } else {
        console.error(`[cron] Feed consumption failed (${res.status}):`, data.error || data)
      }
    } catch (err) {
      console.error('[cron] Feed consumption request error:', err)
    }
  })

  console.log('[cron] Daily feed consumption scheduled at 00:05')
}
