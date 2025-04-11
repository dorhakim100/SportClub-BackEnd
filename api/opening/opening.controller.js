import { logger } from '../../services/logger.service.js'
import { openingService } from './opening.service.js'

export async function getOpeningTimes(req, res) {
  try {
    const days = await openingService.query()
    res.json(days)
  } catch (err) {
    logger.error('Failed to get opening times', err)
    res.status(400).send({ err: 'Failed to get opening times' })
  }
}

export async function updateOpeningTimes(req, res) {
  try {
    const daysToUpdate = req.body
    const updatedDays = await openingService.update(daysToUpdate)
    res.json(updatedDays)
  } catch (err) {
    logger.error('Failed to update opening times', err)
    res.status(400).send({ err: 'Failed to update opening times' })
  }
}
