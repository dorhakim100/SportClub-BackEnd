import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'
import { convertToDate } from '../../services/util.service.js'

const PAGE_SIZE = 6

export const classService = {
  remove,
  query,
  getById,
  add,
  update,
  getTrainers,
  getOccurrences,
}

async function query(filterBy = { txt: '' }) {
  try {
    const criteria = _buildCriteria(filterBy)
    const sort = _buildSort(filterBy)

    const collection = await dbService.getCollection('class')
    var classCursor = await collection.find(criteria, { sort })

    if (filterBy.pageIdx !== undefined) {
      classCursor.skip(filterBy.pageIdx * PAGE_SIZE).limit(PAGE_SIZE)
    }

    const classes = await classCursor.toArray()
    return classes
  } catch (err) {
    logger.error('cannot find classes', err)
    throw err
  }
}

async function getOccurrences(filter) {
  try {
    const criteria = _buildCriteria(filter)
    const sort = _buildSort(filter)

    const collection = await dbService.getCollection('class')
    var classCursor = await collection.find(criteria, { sort })

    const classes = await classCursor.toArray()

    const allOccurrences = []

    classes.forEach((clas) => {
      clas.occurrences.map((occur) => {
        if (!occur.isActive) return
        occur.title = clas.title
        delete occur.time
        allOccurrences.push(occur)
      })
    })
    allOccurrences.sort((item1, item2) => {
      const from1 = convertToDate(item1.from)
      const from2 = convertToDate(item2.from)
      return from1 - from2
    })
    return allOccurrences
  } catch (err) {
    console.log(err)
    throw err
  }
}

async function getById(classId) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(classId) }

    const collection = await dbService.getCollection('class')
    const clas = await collection.findOne(criteria)

    clas.createdAt = clas._id.getTimestamp()
    return clas
  } catch (err) {
    logger.error(`while finding class ${classId}`, err)
    throw err
  }
}

async function getTrainers(classId) {
  try {
    console.log(classId)
    const criteria = { _id: ObjectId.createFromHexString(classId) }

    const collection = await dbService.getCollection('class')
    const clas = await collection.findOne(criteria)
    console.log(clas)

    const trainers = []

    clas.occurrences.forEach((occur) => {
      //   if (trainers.some((trainer) => trainer.id === occur.trainer.id)) return
      console.log(occur.trainer)
      trainers.push(occur.trainer)
    })

    return trainers
  } catch (err) {
    console.log(err)
    throw err
  }
}

async function remove(classId) {
  const { loggedinUser } = asyncLocalStorage.getStore()
  const { _id: ownerId, isAdmin } = loggedinUser

  try {
    const criteria = {
      _id: ObjectId.createFromHexString(classId),
    }
    if (!isAdmin) criteria['owner._id'] = ownerId

    const collection = await dbService.getCollection('class')
    const res = await collection.deleteOne(criteria)

    if (res.deletedCount === 0) throw 'Not your class'
    return classId
  } catch (err) {
    logger.error(`cannot remove class ${classId}`, err)
    throw err
  }
}

async function add(clas) {
  try {
    const collection = await dbService.getCollection('class')
    await collection.insertOne(clas)

    return clas
  } catch (err) {
    logger.error('cannot insert class', err)
    throw err
  }
}

async function update(clas) {
  const classToSave = {
    title: clas.title,
    preview: clas.preview,
    description: clas.description,
    intensity: clas.intensity,
    occurrences: clas.occurrences,
    img: clas.img,
  }

  try {
    const criteria = { _id: ObjectId.createFromHexString(clas._id) }

    const collection = await dbService.getCollection('class')
    await collection.updateOne(criteria, { $set: classToSave })

    return clas
  } catch (err) {
    logger.error(`cannot update class ${clas._id}`, err)
    throw err
  }
}

function _buildCriteria(filterBy) {
  //   const criteria = {
  //     txt: { $regex: filterBy.txt, $options: 'i' },
  //     maxPrice: { $lt: filterBy.maxPrice },
  //     types: { $all: filterBy.types },
  //   }

  //   return criteria
  return {}
}

function _buildSort(filterBy) {
  //   return { [filterBy.maxPrice]: filterBy.sortDir }
  return {}
}
