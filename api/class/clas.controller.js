import { logger } from '../../services/logger.service.js'
import { classService } from './clas.service.js'

export async function getClasses(req, res) {
  try {
    const filterBy = {
      txt: req.query.txt || '',
      pageIdx: +req.query.pageIdx,
      intensity: +req.query.intensity || '',
      isAll: req.query.isAll === 'false' ? false : true,
    }

    const classes = await classService.query(filterBy)
    res.json(classes)
  } catch (err) {
    logger.error('Failed to get classes', err)
    res.status(400).send({ err: 'Failed to get classes' })
  }
}

export async function getOccurrences(req, res) {
  try {
    const filter = req.query

    const occurrences = await classService.getOccurrences(filter)

    res.json(occurrences)
  } catch (err) {
    console.log(err)
    throw err
  }
}

export async function getClassById(req, res) {
  try {
    const classId = req.params.id

    const filterBy = {
      pageIdx: req.query.pageIdx,
      isSkipPage: true,
    }

    const clas = await classService.getById(classId, filterBy)
    res.json(clas)
  } catch (err) {
    logger.error('Failed to get clas', err)
    res.status(400).send({ err: 'Failed to get clas' })
  }
}

export async function getClassTrainers(req, res) {
  try {
    const classId = req.params.id

    const trainers = await classService.getTrainers(classId)

    res.json(trainers)
  } catch (err) {
    console.log(err)
    throw err
  }
}

export async function addClass(req, res) {
  const { loggedinUser, body: clas } = req

  try {
    clas.owner = loggedinUser
    const addedClass = await classService.add(clas)
    res.json(addedClass)
  } catch (err) {
    logger.error('Failed to add clas', err)
    res.status(400).send({ err: 'Failed to add clas' })
  }
}

export async function updateClass(req, res) {
  //   const { loggedinUser, body: clas } = req
  //   const { _id: userId, isAdmin } = loggedinUser

  //   if (!isAdmin && clas.owner._id !== userId) {
  //       res.status(403).send('Not your clas...')
  //       return
  //     }

  const { body: clas } = req
  try {
    const updatedClass = await classService.update(clas)
    res.json(updatedClass)
  } catch (err) {
    logger.error('Failed to update clas', err)
    res.status(400).send({ err: 'Failed to update clas' })
  }
}

export async function removeClass(req, res) {
  try {
    const classId = req.params.id
    const removedId = await classService.remove(classId)

    res.send(removedId)
  } catch (err) {
    logger.error('Failed to remove clas', err)
    res.status(400).send({ err: 'Failed to remove clas' })
  }
}
