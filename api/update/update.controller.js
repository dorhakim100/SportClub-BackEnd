import { logger } from '../../services/logger.service.js'
import { updateService } from './update.service.js'

export async function getUpdates(req, res) {
  try {
    const filterBy = {
      pageIdx: req.query.pageIdx,
      isAll: req.query.isAll || false,
    }
    const updates = await updateService.query(filterBy)
    res.json(updates)
  } catch (err) {
    logger.error('Failed to get updates', err)
    res.status(400).send({ err: 'Failed to get updates' })
  }
}

export async function getUpdateById(req, res) {
  try {
    const updateId = req.params.id
    const update = await updateService.getById(updateId)
    res.json(update)
  } catch (err) {
    logger.error('Failed to get update', err)
    res.status(400).send({ err: 'Failed to get update' })
  }
}

export async function addUpdate(req, res) {
  const { loggedinUser, body: update } = req

  try {
    update.owner = loggedinUser
    const addedUpdate = await updateService.add(update)
    res.json(addedUpdate)
  } catch (err) {
    logger.error('Failed to add update', err)
    res.status(400).send({ err: 'Failed to add update' })
  }
}

export async function updateUpdate(req, res) {
  const { loggedinUser, body: update } = req
  const { _id: userId, isAdmin } = loggedinUser

  if (!isAdmin && update.owner._id !== userId) {
    res.status(403).send('Not your update...')
    return
  }

  try {
    const updatedUpdate = await updateService.update(update)
    res.json(updatedUpdate)
  } catch (err) {
    logger.error('Failed to update update', err)
    res.status(400).send({ err: 'Failed to update update' })
  }
}

export async function removeUpdate(req, res) {
  try {
    const updateId = req.params.id
    const removedId = await updateService.remove(updateId)

    res.send(removedId)
  } catch (err) {
    logger.error('Failed to remove update', err)
    res.status(400).send({ err: 'Failed to remove update' })
  }
}

// Update the order of updates in the database
export async function reorderUpdates(req, res) {
  try {
    const updates = req.body.updates // Expecting an array of updates with position

    // Use a bulk write operation to update multiple items efficiently
    await updateService.saveUpdatesOrder(updates)
    res.status(200).json({ message: 'Order saved successfully' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to save order' })
  }
}
