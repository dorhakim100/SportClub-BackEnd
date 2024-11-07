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

    const messages = messageCursor.toArray()
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

    const messages = messageCursor.toArray()
    return messages.length
  } catch (err) {
    logger.error('cannot find messages', err)
    throw err
  }
}

async function getById(messageId) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(messageId) }

    const collection = await dbService.getCollection('message')
    const message = await collection.findOne(criteria)

    message.createdAt = message._id.getTimestamp()
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
    createdAt: Date.now(),
    isDone: false,
  }

  try {
    const criteria = { _id: ObjectId.createFromHexString(message._id) }

    const collection = await dbService.getCollection('message')
    await collection.updateOne(criteria, { $set: messageToSave })

    return message
  } catch (err) {
    logger.error(`cannot update message ${message._id}`, err)
    throw err
  }
}

function _buildCriteria(filterBy) {
  let criteria = {}

  if (filterBy.onlyOpen) {
    criteria = {
      isDone: { $eq: false },
    }
    return criteria
  }

  if (filterBy.isAll) {
    criteria = {}
  } else {
    const txtCriteria = { $regex: filterBy.txt, $options: 'i' }

    criteria = {
      $or: [
        { name: txtCriteria },
        { title: txtCriteria },
        { content: txtCriteria },
        { phone: txtCriteria },
      ],
      isDone: { $eq: filterBy.onlyDone },
    }
  }

  return criteria
}

function _buildSort(filterBy) {
  return { [filterBy.createdAt]: filterBy.sortDir }
}
