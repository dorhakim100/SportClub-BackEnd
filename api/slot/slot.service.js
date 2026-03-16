import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'

const FACILITIES = ['pool', 'gym']
const DEFAULT_CAPACITY = 12

export const slotService = {
  query,
  create,
  register,
}

async function query(filterBy = {}) {
  try {
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

async function register(slotId,name,phone) {

  try {
    const collection = await dbService.getCollection('slot')
    const _id = ObjectId.createFromHexString(slotId)

    const slot = await collection.findOne({ _id })
    if (!slot) throw new Error('Slot not found')

    const registrations = slot.registrations || []

    const isExists = registrations.find(registration => registration.name === name || registration.phone === phone)

    if (isExists) {
      throw new Error('User already registered for this slot')
    }

    if (registrations.length >= slot.capacity) {
      throw new Error('Slot is full')
    }

    const updatedRegistrations = [...registrations, {name, phone}]

    await collection.updateOne(
      { _id },
      { $set: { registrations: updatedRegistrations } }
    )

    return {
      ...slot,
      registrations: updatedRegistrations,
    }
  } catch (err) {
    logger.error(`cannot register to slot ${slotId}`, err)
    throw err
  }
}

function _buildCriteria(filterBy) {
  const criteria = {}

  if (filterBy.facility && FACILITIES.includes(filterBy.facility)) {
    criteria.facility = filterBy.facility
  }

  if (filterBy.from || filterBy.to) {
    criteria.startTime = {}
    if (filterBy.from) {
      const from = new Date(filterBy.from)
      if (!isNaN(from.getTime())) {
        criteria.startTime.$gte = from
      }
    }
    if (filterBy.to) {
      const to = new Date(filterBy.to)
      if (!isNaN(to.getTime())) {
        criteria.startTime.$lte = to
      }
    }

    if (Object.keys(criteria.startTime).length === 0) {
      delete criteria.startTime
    }
  }

  return criteria
}

