import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'

const PAGE_SIZE = 6

export const itemService = {
  remove,
  query,
  getById,
  add,
  update,
  queryCart,
}

async function query(filterBy = { txt: '' }) {
  try {
    const criteria = _buildCriteria(filterBy)
    const sort = _buildSort(filterBy)

    const collection = await dbService.getCollection('item')
    var itemCursor = await collection.find(criteria, { sort })

    if (filterBy.pageIdx !== undefined && !filterBy.isAll) {
      itemCursor.skip(filterBy.pageIdx * PAGE_SIZE).limit(PAGE_SIZE)
    }

    const items = await itemCursor.toArray()

    if (filterBy.isMax) {
      let maxPage = items.length / PAGE_SIZE
      maxPage = Math.ceil(maxPage)

      return maxPage
    }

    return items
  } catch (err) {
    logger.error('cannot find items', err)
    throw err
  }
}

async function queryCart(cart) {
  try {
    const collection = await dbService.getCollection('item')
    const itemsIds = cart.map((item) => ObjectId.createFromHexString(item.id))

    const itemsFromCollection = await collection
      .aggregate([
        {
          $match: { _id: { $in: itemsIds } },
        },
        {
          $project: {
            id: '$_id',
            _id: 0,
            cover: 1,
            price: 1,
            title: 1,
          },
        },
      ])
      .toArray()

    const itemsToReturn = cart.map((item) => {
      const currItem = itemsFromCollection.find(
        (itemToFind) => itemToFind.id.toString() === item.id
      )
      return currItem ? { ...currItem, quantity: item.quantity } : null
    })

    // Filter out any null entries in case some items are not found
    const filteredItemsToReturn = itemsToReturn.filter(Boolean)

    return filteredItemsToReturn
  } catch (err) {
    logger.error('cannot find items', err)
    throw err
  }
}

async function getById(itemId, filter) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(itemId) }

    const collection = await dbService.getCollection('item')
    // const item = await collection.findOne(criteria)

    let item = await collection
      .aggregate([
        {
          $match: criteria,
        },
        {
          $addFields: {
            optionsIds: {
              $map: {
                input: '$optionsIds',
                as: 'id',
                in: { $toObjectId: '$$id' }, // converts each string to an ObjectId
              },
            },
          },
        },
        {
          $lookup: {
            from: 'option',
            localField: 'optionsIds',
            foreignField: '_id',
            as: 'options',
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            preview: 1,
            price: 1,
            types: 1,
            stockQuantity: 1,
            cover: 1,
            // optionsIds: 0,
            // options: 1,
            options: {
              $map: {
                input: '$options',
                as: 'option',
                in: {
                  id: '$$option._id',
                  title: '$$option.title',
                },
              },
            },
          },
        },
      ])
      .toArray()

    item = item[0]

    // const optionCollection = await dbService.getCollection('option')

    item.createdAt = item._id.getTimestamp()
    const modified = await _setNextPrevItemId(item, filter)
    return modified
  } catch (err) {
    logger.error(`while finding item ${itemId}`, err)
    throw err
  }
}

async function remove(itemId) {
  const { loggedinUser } = asyncLocalStorage.getStore()
  const { _id: ownerId, isAdmin } = loggedinUser

  try {
    const criteria = {
      _id: ObjectId.createFromHexString(itemId),
    }
    if (!isAdmin) criteria['owner._id'] = ownerId

    const collection = await dbService.getCollection('item')
    const res = await collection.deleteOne(criteria)

    if (res.deletedCount === 0) throw 'Not your item'
    return itemId
  } catch (err) {
    logger.error(`cannot remove item ${itemId}`, err)
    throw err
  }
}

async function add(item) {
  try {
    const collection = await dbService.getCollection('item')
    await collection.insertOne(item)

    return item
  } catch (err) {
    logger.error('cannot insert item', err)
    throw err
  }
}

async function update(item) {
  const itemToSave = {
    title: item.title,
    price: item.price,
    preview: item.preview,
    types: item.types,
    stockQuantity: item.stockQuantity,
    cover: item.cover,
  }

  try {
    const { options } = item

    if (options && options.length > 0) {
      const optionCollection = await dbService.getCollection('option')
      const updatedIds = []
      const operations = options.map((option) => {
        const { id } = option
        delete option.id
        if (ObjectId.isValid(id) && id.length === 24) {
          updatedIds.push(id)
          const optionCriteria = { _id: ObjectId.createFromHexString(id) }
          return {
            updateOne: {
              filter: optionCriteria,
              update: { $set: option },
            },
          }
        } else {
          return {
            insertOne: {
              document: option,
            },
          }
        }
      })
      itemToSave.optionsIds = updatedIds

      if (operations.length) {
        const res = await optionCollection.bulkWrite(operations)
        const { insertedIds } = res
        const insertedIdsArray = Object.values(insertedIds)
        if (insertedIdsArray && insertedIdsArray.length > 0) {
          insertedIdsArray.forEach((newId) => {
            itemToSave.optionsIds.push(newId.toString())
          })
        }
      }
    }
    const criteria = { _id: ObjectId.createFromHexString(item._id) }

    const collection = await dbService.getCollection('item')
    await collection.updateOne(criteria, { $set: itemToSave })

    return item
  } catch (err) {
    logger.error(`cannot update item ${item._id}`, err)
    throw err
  }
}

function _buildCriteria(filterBy) {
  let criteria = {}

  if (!filterBy.isAll) {
    // Text search (uncomment if txt filtering is desired)
    if (filterBy.txt) {
      criteria.txt = { $regex: filterBy.txt, $options: 'i' }
    }

    // Price filter
    if (filterBy.maxPrice) {
      criteria.price = { $lt: filterBy.maxPrice }
    }

    // Types filter
    if (filterBy.types && filterBy.types.length > 0) {
      criteria.types = { $in: filterBy.types }
    }
  }

  return criteria
}

function _buildSort(filterBy) {
  if (filterBy.sortDir) {
    return { price: filterBy.sortDir }
  } else {
    return {}
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
