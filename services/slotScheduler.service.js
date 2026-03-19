import cron from 'node-cron'

import { slotService } from '../api/slot/slot.service.js'
import { logger } from './logger.service.js'
import { openingService } from '../api/opening/opening.service.js'
import { socketService } from './socket.service.js'

const OPENING_CHECK_OFFSET_HOURS = 2

export function setupSlotScheduler() {
  // Run at minute 0 of every hour
  cron.schedule('0 * * * *', async () => {
    const threeDays = 72
    const maximumOpeningTime = 16
    const startTime = getHourAhead(threeDays + maximumOpeningTime)
    logger.info('Auto-creating slots for hour', { startTime })
    await createDefaultSlotsForHour(startTime)
  }, {
    timezone: 'Asia/Jerusalem'
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

    const { dayIndex, hour } = getJerusalemDayHour(startTime)

    logger.info('Creating default slots for day', { dayIndex })
    logger.info('hour', { hour })
    
    const opening = await openingService.findByDayIndex(dayIndex)
    
    
    const poolTimes = opening.times.pool
    const gymTimes = opening.times.gym
    
    let shouldCreatePoolSlot = false
    let isGarumiSlot = false
    let shouldCreateGymSlot = false

    let savedPoolSlot = null
    let savedGymSlot = null

    
    


    const isSaturday = dayIndex === 6

    if(!isSaturday && (hour === 7 || hour === 8)) {
      isGarumiSlot = true
    }
    
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
 

        if (hour >= fromHour && hour < toHour) {
          shouldCreateGymSlot = true
        }

    })

    if (shouldCreatePoolSlot) {
        if(isGarumiSlot){
          savedPoolSlot = await slotService.createGarumiSlot({  startTime })
          logger.info('Created Garumi slot for hour', { startTime })
          
        } else {
          savedPoolSlot = await slotService.create({ facility: 'pool', startTime })
          logger.info('Created pool slot for hour', { startTime })
        }
        
      }
      if (shouldCreateGymSlot) {
        if(isGarumiSlot){
          savedGymSlot = await slotService.createGarumiGymSlot({  startTime })
          logger.info('Created Garumi slot for hour', { startTime })
          
        } else {
          savedGymSlot = await slotService.create({ facility: 'gym', startTime })
          logger.info('Created gym slot for hour', { startTime })
        }
      }

      if(savedPoolSlot) {
        socketService.emitTo({ type: 'add-slot', data: { startTime: savedPoolSlot.startTime } })
      }
      if(savedGymSlot) {
        socketService.emitTo({ type: 'add-slot', data: { startTime: savedGymSlot.startTime } })
      }
  } catch (err) {
    logger.error('Failed to auto-create slots for hour', {
      err,
      startTime,
    })
  }
}

function getJerusalemDayHour(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jerusalem',
    weekday: 'short',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const weekdayStr = parts.find((p) => p.type === 'weekday')?.value
  const hour = Number(parts.find((p) => p.type === 'hour')?.value)

  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return { dayIndex: dayMap[weekdayStr], hour }
}
