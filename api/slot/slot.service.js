import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'
import { normalizeDateToYMD } from '../../services/util.service.js'
import { notifyService } from '../../services/notify.service.js'

const FACILITIES = ['pool', 'gym']
const DEFAULT_CAPACITY = 8

export const slotService = {
  query,
  create,
  createGarumiSlot,
  createGarumiGymSlot,
  cancelRegistration,
  register,
  update,
}

async function query(filterBy = {}) {
  try {
    logger.info('filterBy', filterBy)
    const criteria = _buildCriteria(filterBy)
    const sort = { startTime: 1 }

    const collection = await dbService.getCollection('slot')
    const cursor = await collection.find(criteria).sort(sort)

    const slots = await cursor.toArray()
    return slots
  } catch (err) {
    logger.error('cannot find slots', err)
    throw err
  }
}

async function create({ facility, startTime, capacity = DEFAULT_CAPACITY }) {
  try {
    if (!FACILITIES.includes(facility)) {
      throw new Error('Invalid facility')
    }

    const start = new Date(startTime)
    if (isNaN(start.getTime())) {
      throw new Error('Invalid startTime')
    }

    const collection = await dbService.getCollection('slot')

    const existing = await collection.findOne({
      facility,
      startTime: start,
      date: start.toISOString().split('T')[0],
    })

    if (existing) return existing

    const slotToSave = {
      facility,
      startTime: start,
      endTime: new Date(start.getTime() + 1 * 60 * 60 * 1000), // 1 hour
      capacity,
      registrations: [],
      date: start.toISOString().split('T')[0],

    }

    await collection.insertOne(slotToSave)
    return slotToSave
  } catch (err) {
    logger.error('cannot create slot', err)
    throw err
  }
}

async function createGarumiSlot({ startTime }) {
  try {
    const collection = await dbService.getCollection('slot')

    const start = new Date(startTime)
    if (isNaN(start.getTime())) {
      throw new Error('Invalid startTime')
    }


    const existing = await collection.findOne({
      facility: 'pool',
      startTime: start,
      date: start.toISOString().split('T')[0],
    })

    if (existing) return existing

    const slotToSave = _buildGarumiSlotToSave(startTime)

    await collection.insertOne(slotToSave)
    return slotToSave

  } catch (err) {
    logger.error('cannot create garumi slot', err)
    throw err
  }
}
async function createGarumiGymSlot({ startTime }) {
  try {
    const collection = await dbService.getCollection('slot')

    const start = new Date(startTime)
    if (isNaN(start.getTime())) {
      throw new Error('Invalid startTime')
    }


    const existing = await collection.findOne({
      facility: 'gym',
      startTime: start,
      date: start.toISOString().split('T')[0],
    })

    if (existing) return existing

    const slotToSave = _buildGarumiGymSlotToSave(startTime)

    await collection.insertOne(slotToSave)
    return slotToSave

  } catch (err) {
    logger.error('cannot create garumi gym slot', err)
    throw err
  }
}

async function register(slotId,name,phone) {

  try {
    const collection = await dbService.getCollection('slot')
    const _id = ObjectId.createFromHexString(slotId)
    
    const slot = await collection.findOne({ _id })
    if (!slot) throw new Error('Slot not found')
      
      const registrations = slot.registrations || []
      
      name = name.toLowerCase()
      const isExists = registrations.find(registration => registration.name.toLowerCase() === name || registration.phone === phone)

    if (isExists) {
      throw new Error('User already registered for this slot')
    }

    if (registrations.length >= slot.capacity) {
      throw new Error('Slot is full')
    }

    const isAlreadyRegisteredToday = await collection.findOne({
      facility: slot.facility,
      date: slot.date,
      registrations: { $elemMatch: { $or: [{ phone }, { name:name.toLowerCase() }] } }
    })

    if (isAlreadyRegisteredToday) {
      throw new Error('User already registered for this slot today')
    }

    const updatedRegistrations = [...registrations, {name, phone}]
    
    await collection.updateOne(
      { _id },
      { $set: { registrations: updatedRegistrations } }
    )
    
    await notifyService.sendRegistrationConfirmation(slot, { name, phone })
    
    return {
      ...slot,
      registrations: updatedRegistrations,
    }
  } catch (err) {
    logger.error(`cannot register to slot ${slotId}`, err)
    throw err
  }
}

async function update(slotId, slot) {
  try {
    const collection = await dbService.getCollection('slot')
    const _id = ObjectId.createFromHexString(slotId)
    
    const slotToSave = { ...slot }
    delete slotToSave._id
    
    const updatedRegistrations = slot.registrations
    await collection.updateOne(
      { _id },
      { $set: { registrations: updatedRegistrations } }
    )    
    return { _id: slotId, ...slotToSave }
  } catch (err) {
    logger.error(`cannot update slot ${slotId}`, err)
    throw err
  }
}
async function cancelRegistration(slotId, phoneNumber) {
  try {
    const collection = await dbService.getCollection('slot')
    const _id = ObjectId.createFromHexString(slotId)

    const slot = await collection.findOne({ _id })
    if (!slot) throw new Error('Slot not found')

    const newRegistrations = slot.registrations.filter(registration => registration.phone !== phoneNumber)
    
    await collection.updateOne(
      { _id },
      { $set: { registrations: newRegistrations } }
    )    
    return { ...slot, registrations: newRegistrations }
  } catch (err) {
    logger.error(`cannot cancel registration to slot ${slotId}`, err)
    throw err
  }
}

function _buildCriteria(filterBy) {
  const criteria = {}

  const { date, facility } = filterBy
  const isToday = normalizeDateToYMD(new Date()) === normalizeDateToYMD(date)

  if (facility && FACILITIES.includes(facility)) {
    criteria.facility = facility
  }

  // if (filterBy.from || filterBy.to) {

    if (filterBy.from && isToday) {
      criteria.startTime = {}
      const fromDate = new Date(filterBy.from)
      if (!isNaN(fromDate.getTime())) {
        criteria.startTime.$gte = fromDate
      }
    }
  //   if (to && isToday) {
  //     const toDate = new Date(to)
  //     if (!isNaN(toDate.getTime())) {
  //       criteria.startTime.$lte = toDate
  //     }
  //   }


  // }
  if (date) {
    const datePlus2Hours = new Date(date).getTime() + 2 * 60 * 60 * 1000
    logger.info('filterBy.date', normalizeDateToYMD(datePlus2Hours))
    criteria.date = normalizeDateToYMD(datePlus2Hours)
  }

  return criteria
}

function _buildGarumiSlotToSave(startTime) {

  const registrations = [
    { name: 'Garumi', phone: '0525658565' },
    { name: 'Garumi', phone: '0525658565' },
    { name: 'Garumi', phone: '0525658565' },
    { name: 'Garumi', phone: '0525658565' },
    { name: 'Garumi', phone: '0525658565' },
    { name: 'Garumi', phone: '0525658565' },

  ]

  return {
    facility: 'pool',
    startTime: new Date(startTime),
    endTime: new Date(startTime.getTime() + 1 * 60 * 60 * 1000), // 1 hour
    capacity: DEFAULT_CAPACITY,
    registrations: registrations,
    date: startTime.toISOString().split('T')[0],
  }
}
function _buildGarumiGymSlotToSave(startTime) {

  const registrations = [
    { name: 'Garumi', phone: '0525658565' },
    { name: 'Garumi', phone: '0525658565' },

  ]

  return {
    facility: 'gym',
    startTime: new Date(startTime),
    endTime: new Date(startTime.getTime() + 1 * 60 * 60 * 1000), // 1 hour
    capacity: DEFAULT_CAPACITY,
    registrations: registrations,
    date: startTime.toISOString().split('T')[0],
  }
}