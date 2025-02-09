import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'

const PAGE_SIZE = 6

export const messageService = {
  remove,
  query,
  getById,
  add,
  update,
  queryOpen,
  removeBulk,
}

async function query(filterBy = { txt: '' }) {
  try {
    const criteria = _buildCriteria(filterBy)
    const sort = _buildSort(filterBy)

    const collection = await dbService.getCollection('message')
    var messageCursor = await collection.find(criteria, { sort })

    if (filterBy.pageIdx !== undefined && !filterBy.isAll) {
      messageCursor.skip(filterBy.pageIdx * PAGE_SIZE).limit(PAGE_SIZE)
    }

    const messages = await messageCursor.toArray()

    return messages
  } catch (err) {
    logger.error('cannot find messages', err)
    throw err
  }
}
async function queryOpen() {
  try {
    const criteria = _buildCriteria({ onlyOpen: true })
    const sort = {}

    const collection = await dbService.getCollection('message')
    var messageCursor = await collection.find(criteria, { sort })

    const messages = await messageCursor.toArray()
    return messages.length
  } catch (err) {
    logger.error('cannot find messages', err)
    throw err
  }
}

async function getById(messageId, filter) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(messageId) }

    const collection = await dbService.getCollection('message')
    const message = await collection.findOne(criteria)

    message.createdAt = message._id.getTimestamp()

    const modified = await _setNextPrevItemId(message, filter)

    return message
  } catch (err) {
    logger.error(`while finding message ${messageId}`, err)
    throw err
  }
}

async function remove(messageId) {
  const { loggedinUser } = asyncLocalStorage.getStore()
  const { _id: ownerId, isAdmin } = loggedinUser

  try {
    const criteria = {
      _id: ObjectId.createFromHexString(messageId),
    }
    if (!isAdmin) criteria['owner._id'] = ownerId

    const collection = await dbService.getCollection('message')
    const res = await collection.deleteOne(criteria)

    if (res.deletedCount === 0) throw 'Not your message'
    return messageId
  } catch (err) {
    logger.error(`cannot remove message ${messageId}`, err)
    throw err
  }
}

async function removeBulk(ids) {
  try {
    // Convert the array of IDs to ObjectId
    const objectIds = ids.map((id) => ObjectId.createFromHexString(id))

    // Create the query criteria
    const criteria = { _id: { $in: objectIds } }

    // Get the collection
    const collection = await dbService.getCollection('message')

    // Use deleteMany for bulk deletion
    const res = await collection.deleteMany(criteria)

    if (res.deletedCount === 0) throw new Error('No messages deleted')

    return ids // Return the deleted IDs
  } catch (err) {
    logger.error(`cannot remove messages ${ids}`, err)
    throw err
  }
}

async function add(message) {
  try {
    const collection = await dbService.getCollection('message')
    await collection.insertOne(message)

    return message
  } catch (err) {
    logger.error('cannot insert message', err)
    throw err
  }
}

async function update(message) {
  const messageToSave = {
    name: message.name,
    title: message.title,
    content: message.content,
    phone: message.phone,
    createdAt: message.createdAt,
    isDone: message.isDone,
  }

  try {
    const criteria = { _id: ObjectId.createFromHexString(message._id) }

    const collection = await dbService.getCollection('message')
    const saved = await collection.updateOne(criteria, { $set: messageToSave })

    return saved
  } catch (err) {
    logger.error(`cannot update message ${message._id}`, err)
    throw err
  }
}

function _buildCriteria(filterBy) {
  let criteria = {}

  if (filterBy.txt) {
    const txtCriteria = { $regex: filterBy.txt, $options: 'i' }

    criteria = {
      $or: [
        { name: txtCriteria },
        { title: txtCriteria },
        { content: txtCriteria },
        { phone: txtCriteria },
      ],
    }
  }

  if (filterBy.onlyDone) {
    criteria.isDone = {
      $eq: false,
    }
  }
  if (filterBy.onlyOpen) {
    criteria.isDone = {
      $eq: false,
    }
  }

  return criteria
}

function _buildSort(filterBy) {
  if (filterBy.sortDir) {
    return { createdAt: filterBy.sortDir }
  } else {
    return { createdAt: 1 }
  }
}

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
