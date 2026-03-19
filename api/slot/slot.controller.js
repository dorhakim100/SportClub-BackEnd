import { logger } from '../../services/logger.service.js'
import { slotService } from './slot.service.js'

export async function getSlots(req, res) {
  try {
    const filterBy = {
      facility: req.query?.facility,
      from: req.query?.from,
      to: req.query?.to,
      date: req.query?.date,
    }

    const slots = await slotService.query(filterBy)
    res.json(slots)
  } catch (err) {
    logger.error('Failed to get slots', err)
    res.status(400).send({ err: 'Failed to get slots' })
  }
}

export async function createSlot(req, res) {
  try {
    const { facility, startTime, capacity } = req.body
    const slot = await slotService.create({ facility, startTime, capacity })
    res.status(201).json(slot)
  } catch (err) {
    logger.error('Failed to create slot', err)
    res.status(400).send({ err: err.message || 'Failed to create slot' })
  }
}

export async function registerToSlot(req, res) {
  try {
    const { name, phone } = req.body
    const slotId = req.params.id
    const updatedSlot = await slotService.register(slotId,name,phone)
    res.json(updatedSlot)
  } catch (err) {
    logger.error('Failed to register to slot', err)
    res.status(400).send({ err: err.message || 'Failed to register to slot' })
  }
}

export async function updateSlot(req, res) {
  try {
    const slotId = req.params.id
    const slot = req.body
    const updatedSlot = await slotService.update(slotId, slot)
    res.json(updatedSlot)
  } catch (err) {
    logger.error('Failed to update slot', err)
    res.status(400).send({ err: err.message || 'Failed to update slot' })
  }
}


export async function cancelRegistrationToSlot(req, res) {
  try {
    const slotId = req.params.id
    const phoneNumber = req.body.phoneToDelete
    logger.info(`cancelling registration to slot ${slotId} with phone number ${phoneNumber}`)
    const updatedSlot = await slotService.cancelRegistration(slotId, phoneNumber)

    res.json(updatedSlot)
  } catch (err) {
    logger.error('Failed to cancel registration to slot', err)
    res.status(400).send({ err: err.message || 'Failed to cancel registration to slot' })
  }
}