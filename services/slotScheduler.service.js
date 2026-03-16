import cron from 'node-cron'

import { slotService } from '../api/slot/slot.service.js'
import { logger } from './logger.service.js'

function getHourAhead(hoursAhead = 24) {
  const now = new Date()
  // Round down to the current hour
  now.setMinutes(0, 0, 0)
  // Target is current hour + 1, then shifted by (hoursAhead - 1)
  const nextHour = new Date(now.getTime() + 60 * 60 * 1000)
  const target = new Date(nextHour.getTime() + (hoursAhead - 1) * 60 * 60 * 1000)
  return target
}

async function createDefaultSlotsForHour(startTime) {
  try {
    await slotService.create({ facility: 'pool', startTime })
    await slotService.create({ facility: 'gym', startTime })
  } catch (err) {
    logger.error('Failed to auto-create slots for hour', {
      err,
      startTime,
    })
  }
}

export function setupSlotScheduler() {
  // Run at minute 0 of every hour
  cron.schedule('0 * * * *', async () => {
    const startTime = getHourAhead(24)
    logger.info('Auto-creating slots for hour', { startTime })
    await createDefaultSlotsForHour(startTime)
  })
}

