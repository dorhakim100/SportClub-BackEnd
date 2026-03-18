import cron from 'node-cron'

import { slotService } from '../api/slot/slot.service.js'
import { logger } from './logger.service.js'
import { openingService } from '../api/opening/opening.service.js'
import { socketService } from './socket.service.js'

export function setupSlotScheduler() {
  // Run at minute 0 of every hour
  cron.schedule('0 * * * *', async () => {
    const startTime = getHourAhead(24)
    logger.info('Auto-creating slots for hour', { startTime })
    await createDefaultSlotsForHour(startTime)
  })
}


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
    const dayIndex = new Date(startTime).getDay()
    logger.info('Creating default slots for day', { dayIndex })

    const opening = await openingService.findByDayIndex(dayIndex)


    const poolTimes = opening.times.pool
    const gymTimes = opening.times.gym

    let shouldCreatePoolSlot = false
    let isGarumiSlot = false
    let shouldCreateGymSlot = false

    const hour = new Date(startTime).getHours()

    poolTimes.forEach((time) => {
      const fromHour = +time.from.split(':')[0]
      const toHour = +time.to.split(':')[0]

        if (hour >= fromHour && hour < toHour) {
          shouldCreatePoolSlot = true

      }
    })

    gymTimes.forEach((time) => {
      const fromHour = +time.from.split(':')[0]
      const toHour = +time.to.split(':')[0]

      const isSaturday = dayIndex === 6

      if(!isSaturday && (fromHour === 7 || fromHour === 8 || fromHour === 9)) {
        isGarumiSlot = true
      }

        if (hour >= fromHour && hour < toHour) {
          shouldCreateGymSlot = true
        }

    })

    if (shouldCreatePoolSlot) {

      if(isGarumiSlot){
        await slotService.createGarumiSlot({  startTime })
        logger.info('Created Garumi slot for hour', { startTime })
        
      } else {
        await slotService.create({ facility: 'pool', startTime })
        logger.info('Created pool slot for hour', { startTime })
      }
    }
    if (shouldCreateGymSlot) {
      await slotService.create({ facility: 'gym', startTime })
      logger.info('Created gym slot for hour', { startTime })
    }
    socketService.emitTo({ type: 'add-slot', data: { startTime } })
  } catch (err) {
    logger.error('Failed to auto-create slots for hour', {
      err,
      startTime,
    })
  }
}


