export async function register() {
  // Only run cron in the Node.js runtime (not Edge)
  const enableInProcessCron = process.env.FEEDS_CRON_IN_PROCESS !== '0'
  if (process.env.NEXT_RUNTIME === 'nodejs' && enableInProcessCron) {
    const { scheduleFeedsCron } = await import('./lib/cron')
    scheduleFeedsCron()
  }
}
