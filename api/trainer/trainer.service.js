import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'

const PAGE_SIZE = 6

export const trainerService = {
  remove,
  query,
  getById,
  add,
  update,
}

async function query(filterBy = { txt: '' }) {
  try {
    const criteria = _buildCriteria(filterBy)
    const sort = _buildSort(filterBy)

    const collection = await dbService.getCollection('trainer')
    var trainerCursor = await collection.find(criteria, { sort })

    // if (filterBy.pageIdx !== undefined && !filterBy.isAll) {
    //   trainerCursor.skip(filterBy.pageIdx * PAGE_SIZE).limit(PAGE_SIZE)
    // }

    const trainers = await trainerCursor.toArray()
    return trainers
  } catch (err) {
    logger.error('cannot find trainers', err)
    throw err
  }
}

async function getById(trainerId) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(trainerId) }

    const collection = await dbService.getCollection('trainer')
    const trainer = await collection.findOne(criteria)

    trainer.createdAt = trainer._id.getTimestamp()
    return trainer
  } catch (err) {
    logger.error(`while finding trainer ${trainerId}`, err)
    throw err
  }
}

async function remove(trainerId) {
  const { loggedinUser } = asyncLocalStorage.getStore()
  const { _id: ownerId, isAdmin } = loggedinUser

  try {
    const criteria = {
      _id: ObjectId.createFromHexString(trainerId),
    }
    if (!isAdmin) criteria['owner._id'] = ownerId

    const collection = await dbService.getCollection('trainer')
    const res = await collection.deleteOne(criteria)

    if (res.deletedCount === 0) throw 'Not your trainer'
    return trainerId
  } catch (err) {
    logger.error(`cannot remove trainer ${trainerId}`, err)
    throw err
  }
}

async function add(trainer) {
  try {
    const collection = await dbService.getCollection('trainer')
    await collection.insertOne(trainer)

    return trainer
  } catch (err) {
    logger.error('cannot insert trainer', err)
    throw err
  }
}

async function update(trainer) {
  const trainerToSave = {
    name: { he: trainer.name.he, eng: trainer.name.eng },
    types: trainer.types,
    img: trainer.img,
    preview: { he: trainer.preview.he, eng: trainer.preview.eng },

    experience: trainer.experience,
  }

  try {
    const criteria = { _id: ObjectId.createFromHexString(trainer._id) }

    const collection = await dbService.getCollection('trainer')
    await collection.updateOne(criteria, { $set: trainerToSave })

    return trainer
  } catch (err) {
    logger.error(`cannot update trainer ${trainer._id}`, err)
    throw err
  }
}

function _buildCriteria(filterBy) {
  let criteria = {} // Initialize criteria as an empty object

  if (filterBy.isAll) {
    return criteria // Return empty criteria if 'isAll' is true
  }
  console.log(filterBy)
  if (filterBy.types && filterBy.types.length > 0) {
    criteria.types = { $in: filterBy.types } // Apply types filter if present
  }

  // You can add more conditions here for other filter types like range, dates, etc.
  // For example:
  // if (filterBy.range) {
  //   criteria.value = { $gte: filterBy.range.min, $lte: filterBy.range.max };
  // }

  return criteria // Return the constructed criteria
}

function _buildSort(filterBy) {
  //   return { [filterBy.maxPrice]: filterBy.sortDir }
  return {}
}
