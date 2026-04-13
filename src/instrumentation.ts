export async function register() {
  // Only run cron in the Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { scheduleFeedsCron } = await import('./lib/cron')
    scheduleFeedsCron()
  }
}
