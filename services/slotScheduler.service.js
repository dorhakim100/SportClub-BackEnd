import cron from 'node-cron'
import { DateTime } from 'luxon'


import { slotService } from '../api/slot/slot.service.js'
import { logger } from './logger.service.js'
import { openingService } from '../api/opening/opening.service.js'
import { socketService } from './socket.service.js'
import { notifyService } from './notify.service.js'
const TIMEZONE = 'Asia/Jerusalem'
const OPENING_HOUR_SHIFT =  -1 // summer clock in Israel
// const OPENING_HOUR_SHIFT =  0 // winter clock in Israel

export function setupSlotScheduler() {
  // Run at minute 0 of every hour
  cron.schedule('0 * * * *', async () => {
    const threeDays = 72
    const maximumOpeningTime = 16
    const startTime3DaysAhead = getHourAheadInJerusalem(threeDays + maximumOpeningTime)
    
    const startTime72HoursAhead = getHourAheadInJerusalem(threeDays)
    const startTime112HoursAhead = getHourAheadInJerusalem(112)

    
    logger.info('Auto-creating slots for hour', { startTime3DaysAhead })
    try {
        await createDefaultSlotsForHour(startTime3DaysAhead)
          
        
        logger.info('Created slots for 3 days ahead', { startTime3DaysAhead })
      } catch (err) {
        logger.error('Failed to auto-create slots', { err })
      }
      try {
        
        
        await createDefaultSlotsForHour(startTime72HoursAhead)
        
        
        logger.info('Created slots for 72 hours ahead', { startTime72HoursAhead })
      } catch (err) {
        logger.error('Failed to auto-create slots', { err })
      }
      try {
  
          await createDefaultSlotsForHour(startTime112HoursAhead)
          
          
          logger.info('Created slots for 112 hours ahead', { startTime112HoursAhead })
        } catch (err) {
          logger.error('Failed to auto-create slots', { err })
        }
      
  }, {
    timezone: TIMEZONE,
  })
}

async function createDefaultSlotsForHour(startTime) {
  try {

    let { dayIndex, hour } = getJerusalemDayHour(startTime)
    hour = hour + OPENING_HOUR_SHIFT

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
    const isFriday = dayIndex === 5

    

    if((!isSaturday && !isFriday) && (hour  === (7 + OPENING_HOUR_SHIFT)  || hour  === (8 + OPENING_HOUR_SHIFT))) {
      isGarumiSlot = true
    }
    
    if(isFriday && (hour  === (11 + OPENING_HOUR_SHIFT) || hour  === (12 + OPENING_HOUR_SHIFT))){
      isGarumiSlot = true
    }
    
    poolTimes.forEach((time) => {
      const fromHour = +time.from.split(':')[0] + OPENING_HOUR_SHIFT
      const toHour = +time.to.split(':')[0] + OPENING_HOUR_SHIFT
      logger.info('Trying to create pool slot for hour',{hour}, { fromHour, toHour })
      
        if (hour  >= fromHour  && hour  < toHour ) {
          shouldCreatePoolSlot = true

      }
    })

    gymTimes.forEach((time) => {
      const fromHour = +time.from.split(':')[0] + OPENING_HOUR_SHIFT
      const toHour = +time.to.split(':')[0] + OPENING_HOUR_SHIFT      

      logger.info('Trying to create gym slot for hour',{hour}, { fromHour, toHour })
 

        if (hour  >= fromHour  && hour  < toHour ) {
          shouldCreateGymSlot = true
        }

    })

    if (shouldCreatePoolSlot) {
        if(isGarumiSlot){
          savedPoolSlot = await slotService.createGarumiSlot({  startTime })
          logger.info('Created Garumi slot for hour',{hour}, { startTime })
          
        } else {
          savedPoolSlot = await slotService.create({ facility: 'pool', startTime })
          logger.info('Created pool slot for hour',{hour}, { startTime })
        }
        
      }
      if (shouldCreateGymSlot) {
        if(isGarumiSlot){
          savedGymSlot = await slotService.createGarumiGymSlot({  startTime })
          logger.info('Created Garumi slot for hour',{hour}, { startTime })
          
        } else {
          savedGymSlot = await slotService.create({ facility: 'gym', startTime })
          logger.info('Created gym slot for hour',{hour}, { startTime })
        }
      }

      if(savedPoolSlot) {
        socketService.emitTo({ type: 'add-slot', data: { hour: hour, startTime: savedPoolSlot.startTime } })
      }
      if(savedGymSlot) {
        socketService.emitTo({ type: 'add-slot', data: { hour: hour, startTime: savedGymSlot.startTime } })
      }
  } catch (err) {
    const facility = savedPoolSlot ? 'gym' : 'pool'
    logger.error('Failed to auto-create slots for hour', {
      err,
      startTime,
    })
    notifyService.sendErrorSlotCreation(startTime, startTime, startTime, facility)


  }
}

function getJerusalemDayHour(date) {
  const dt = DateTime.fromJSDate(date, { zone: TIMEZONE })

  // Sunday = 0 ... Saturday = 6
  const dayIndex = dt.weekday % 7

  return {
    dayIndex,
    hour: dt.hour,
  }
}

function getHourAheadInJerusalem(hoursAhead = 24) {
  return DateTime.now()
    .setZone(TIMEZONE)
    .startOf('hour')
    .plus({ hours: hoursAhead })
    .toJSDate()
}