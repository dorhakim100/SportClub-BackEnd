import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'

const PAGE_SIZE = 6
const DEFAULT_IMG =
  'https://ik.imagekit.io/n4mhohkzp/blank-profile-picture.webp?updatedAt=1755684200284'
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
    const collection = await dbService.getCollection('trainer')
    const limit = PAGE_SIZE

    const aggregationPipeline = [
      { $match: criteria }, // Apply filter criteria
      {
        $addFields: {
          isDefaultImg: { $eq: ['$img', DEFAULT_IMG] }, // Identify default images
        },
      },
      { $sort: { isDefaultImg: 1, name: 1 } }, // Sort by `isDefaultImg`, then by `name`
    ]

    if (
      !filterBy.isRandom &&
      !filterBy.isSkipPage &&
      filterBy.pageIdx !== undefined &&
      !filterBy.isAll
    ) {
      const skip = filterBy.pageIdx * PAGE_SIZE

      aggregationPipeline.push({ $skip: skip })
      aggregationPipeline.push({ $limit: limit })
    } else if (filterBy.isRandom) {
      aggregationPipeline.push({
        $match: { img: { $ne: DEFAULT_IMG } },
      })
      aggregationPipeline.push({ $sample: { size: limit } })
    }

    const trainers = await collection.aggregate(aggregationPipeline).toArray()

    if (filterBy.isMax) {
      let maxPage = trainers.length / PAGE_SIZE
      maxPage = Math.ceil(maxPage)

      return maxPage
    }

    return trainers
  } catch (err) {
    logger.error('cannot find trainers', err)
    throw err
  }
}

async function getById(trainerId, filter) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(trainerId) }

    const collection = await dbService.getCollection('trainer')
    const trainer = await collection.findOne(criteria)
    trainer.createdAt = trainer._id.getTimestamp()
    const modified = await _setNextPrevItemId(trainer, filter)
    return modified
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
  if (filterBy.isAll) {
    return {} // Return empty criteria if 'isAll' is true
  }

  // If `isRandom` is true, use an aggregation pipeline with `$sample`

  // Otherwise, build a standard criteria object
  const criteria = {}

  // Apply types filter if present
  if (filterBy.types && filterBy.types.length > 0) {
    criteria.types = { $in: filterBy.types }
  }

  return criteria // Return the constructed criteria
}

function _buildSort(filterBy) {
  //   return { [filterBy.maxPrice]: filterBy.sortDir }
  return {}
}

// function _setNextPrevItemId(items) {
//   const itemsToReturn = items.map((item) => {
//     const itemId = item._id
//     const nextItem = items[itemId + 1] ? items[itemId + 1] : items[0]
//     const prevItem = items[itemId - 1]
//       ? items[itemId - 1]
//       : items[items.length - 1]
//     item.prevNext = {
//       next: nextItem._id,
//       prev: prevItem._id,
//     }

//     return item
//   })
//   return itemsToReturn
// }

async function _setNextPrevItemId(item, filter) {
  try {
    const items = await query(filter)

    if (!items.length) {
      throw new Error('No items found for the given filter.')
    }
    const itemIdx = items.findIndex(
      (currItem) => currItem._id.toHexString() === item._id.toHexString()
    )

    const nextItem = items[itemIdx + 1] ? items[itemIdx + 1] : items[0]
    const prevItem = items[itemIdx - 1]
      ? items[itemIdx - 1]
      : items[items.length - 1]

    item.prevNext = {
      next: nextItem._id,
      prev: prevItem._id,
    }

    return item
  } catch (err) {
    logger.error(`cannot load item ${item._id}`, err)
    throw err
  }
}
