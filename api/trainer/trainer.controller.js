import { logger } from '../../services/logger.service.js'
import { trainerService } from './trainer.service.js'

export async function getTrainers(req, res) {
  try {
    const filterBy = {
      types: req.query.types || [],
      pageIdx: req.query.pageIdx,
      isAll: req.query.isAll === 'true' ? true : false,
      isRandom: req.query.isRandom === 'true' ? true : false,
      isMax: req.query.isMax === 'true' ? true : false,
    }

    const trainers = await trainerService.query(filterBy)

    if (filterBy.isMax) {
      return res.json(trainers)
    }
    res.json(trainers)
  } catch (err) {
    logger.error('Failed to get trainers', err)
    res.status(400).send({ err: 'Failed to get trainers' })
  }
}

export async function getTrainerById(req, res) {
  try {
    const trainerId = req.params.id

    const filterBy = {
      types: req.query.types || [],
      pageIdx: req.query.pageIdx,
      isAll: false,
      isRandom: false,
      isSkipPage: true,
    }

    const trainer = await trainerService.getById(trainerId, filterBy)
    res.json(trainer)
  } catch (err) {
    logger.error('Failed to get trainer', err)
    res.status(400).send({ err: 'Failed to get trainer' })
  }
}

export async function addTrainer(req, res) {
  const { loggedinUser, body: trainer } = req

  try {
    trainer.owner = loggedinUser
    const addedTrainer = await trainerService.add(trainer)
    res.json(addedTrainer)
  } catch (err) {
    logger.error('Failed to add trainer', err)
    res.status(400).send({ err: 'Failed to add trainer' })
  }
}

export async function updateTrainer(req, res) {
  //   const { loggedinUser, body: trainer } = req
  //   const { _id: userId, isAdmin } = loggedinUser

  //   if (!isAdmin && trainer.owner._id !== userId) {
  //     res.status(403).send('Not your trainer...')
  //     return
  //   }
  const { body: trainer } = req

  try {
    const updatedTrainer = await trainerService.update(trainer)
    res.json(updatedTrainer)
  } catch (err) {
    logger.error('Failed to update trainer', err)
    res.status(400).send({ err: 'Failed to update trainer' })
  }
}

export async function removeTrainer(req, res) {
  try {
    const trainerId = req.params.id
    const removedId = await trainerService.remove(trainerId)

    res.send(removedId)
  } catch (err) {
    logger.error('Failed to remove trainer', err)
    res.status(400).send({ err: 'Failed to remove trainer' })
  }
}
