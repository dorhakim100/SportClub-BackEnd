import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'

export const openingService = {
  query,

  update,
}

async function query() {
  try {
    const criteria = _buildCriteria()
    const sort = _buildSort()

    const collection = await dbService.getCollection('opening')
    var openingCursor = await collection.find(criteria).sort(sort)

    const days = await openingCursor.toArray()

    return days
  } catch (err) {
    logger.error('cannot find messages', err)
    throw err
  }
}

async function update(daysToUpdate) {
  try {
    const collection = await dbService.getCollection('opening')
    const days = await collection.find().toArray()

    const bulkOps = days.map((day) => {
      const dayToUpdate = daysToUpdate.find((d) => d._id === day._id.toString())
      console.log(dayToUpdate)
      if (dayToUpdate) {
        const currId = dayToUpdate._id
        delete dayToUpdate._id
        return {
          updateOne: {
            filter: { _id: ObjectId.createFromHexString(currId) },
            update: { $set: { ...day, ...dayToUpdate } },
          },
        }
      }
      return null
    })

    await collection.bulkWrite(bulkOps.filter(Boolean))

    return days
  } catch (err) {
    logger.error('cannot update opening times', err)
    throw err
  }
}

function _buildCriteria() {
  const criteria = {}

  return criteria
}

function _buildSort() {
  return { index: 1 }
}
