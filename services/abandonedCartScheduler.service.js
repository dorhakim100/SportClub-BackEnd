import cron from 'node-cron'

import { logger } from './logger.service.js'

const TIMEZONE = 'Asia/Jerusalem'

export function setupAbandonedCartScheduler() {
  // Run at minute 0 of every hour
  cron.schedule(
    '0 * * * *',
    async () => {
      logger.info('Running abandoned-cart scheduler')
      try {
        await runAbandonedCartSchedulerCycle()
        logger.info('Finished abandoned-cart scheduler cycle')
      } catch (err) {
        logger.error('Failed abandoned-cart scheduler cycle', { err })
      }
    },
    {
      timezone: TIMEZONE,
    }
  )
}

async function runAbandonedCartSchedulerCycle() {
  // Business logic will be added in the next step:
  // 1) locate users with stale cart items
  // 2) send abandoned-cart email
  // 3) mark emailed items with emailSent=true
}
