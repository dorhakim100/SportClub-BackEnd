import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'

const PAGE_SIZE = 6

export const updateService = {
  remove,
  query,
  getById,
  add,
  update,
  saveUpdatesOrder,
  getMessageUpdate,
}

async function query(filterBy = { txt: '' }) {
  try {
    const criteria = _buildCriteria(filterBy)
    const sort = _buildSort(filterBy)

    const collection = await dbService.getCollection('update')
    var updateCursor = await collection.find(criteria, { sort })

    if (filterBy.pageIdx !== undefined && !filterBy.isAll) {
      updateCursor.skip(filterBy.pageIdx * PAGE_SIZE).limit(PAGE_SIZE)
    }

    var updates = await updateCursor.toArray()

    if (filterBy.isMax) {
      let maxPage = updates.length / PAGE_SIZE
      maxPage = Math.ceil(maxPage)

      return maxPage
    }

    return updates
  } catch (err) {
    logger.error('cannot find updates', err)
    throw err
  }
}

async function getById(updateId) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(updateId) }

    const collection = await dbService.getCollection('update')
    const update = await collection.findOne(criteria)

    update.createdAt = update._id.getTimestamp()
    return update
  } catch (err) {
    logger.error(`while finding update ${updateId}`, err)
    throw err
  }
}
async function getMessageUpdate() {
  try {
    const criteria = { isMessage: true }
    const collection = await dbService.getCollection('update')
    const update = await collection.findOne(criteria)

    return update
  } catch (err) {
    logger.error(`Error while finding update with isMessage true`, err)
    throw err
  }
}

async function remove(updateId) {
  const { loggedinUser } = asyncLocalStorage.getStore()
  const { _id: ownerId, isAdmin } = loggedinUser

  try {
    const criteria = {
      _id: ObjectId.createFromHexString(updateId),
    }
    if (!isAdmin) criteria['owner._id'] = ownerId

    const collection = await dbService.getCollection('update')
    const res = await collection.deleteOne(criteria)

    if (res.deletedCount === 0) throw 'Not your update'
    return updateId
  } catch (err) {
    logger.error(`cannot remove update ${updateId}`, err)
    throw err
  }
}

async function add(update) {
  try {
    const collection = await dbService.getCollection('update')
    await collection.insertOne(update)

    return update
  } catch (err) {
    logger.error('cannot insert update', err)
    throw err
  }
}

async function update(sentUpdate) {
  const updateToSave = {
    title: sentUpdate.title,
    content: sentUpdate.content,
    createdAt: sentUpdate.createdAt,
    position: sentUpdate.position,
    isMessage: sentUpdate.isMessage,
  }
  const isOnlyMessage = sentUpdate.isOnlyMessage

  try {
    const criteria = { _id: ObjectId.createFromHexString(sentUpdate._id) }
    const collection = await dbService.getCollection('update')

    // Build update query to apply to all documents:
    // - Always increment position by 1.
    // - If the sent update is marked as isMessage,
    //   reset isMessage to false for all documents.
    let updateFields = {}
    if (!isOnlyMessage) {
      updateFields = { $inc: { position: 1 } }
    }
    updateFields.$set = { isMessage: false }

    // Update all documents in one go
    await collection.updateMany({}, updateFields)

    // Update the specific document with the new values
    await collection.updateOne(criteria, { $set: updateToSave })

    return updateToSave
  } catch (err) {
    logger.error(`cannot update update ${sentUpdate._id}`, err)
    throw err
  }
}

// async function update(sentUpdate) {
//   const updateToSave = {
//     title: sentUpdate.title,
//     content: sentUpdate.content,
//     createdAt: sentUpdate.createdAt,
//     position: sentUpdate.position,
//     isMessage: sentUpdate.isMessage,
//   }

//   try {
//     const criteria = { _id: ObjectId.createFromHexString(sentUpdate._id) }

//     const collection = await dbService.getCollection('update')

//     var updateCursor = await collection.find({}, {})

//     var updates = await updateCursor.toArray()

//     await Promise.all(
//       updates.map((update) => {
//         collection.updateOne(
//           { _id: update._id },
//           // { _id: ObjectId.createFromHexString(update._id) },
//           {
//             $set: {
//               position: update.position + 1,
//               isMessage: sentUpdate.isMessage ? false : update.isMessage,
//             },
//           }
//         )
//       })
//     )

//     const updated = await collection.updateOne(criteria, { $set: updateToSave })

//     return updated
//   } catch (err) {
//     logger.error(`cannot update update ${update._id}`, err)
//     throw err
//   }
// }

async function saveUpdatesOrder(reordered) {
  try {
    const collection = await dbService.getCollection('update')
    // const bulkOps = reordered.map((update) => ({
    //   updateOne: {
    //     filter: { _id: ObjectId.createFromHexString(update._id) },
    //     update: {
    //       $set: {
    //         position: update.position,
    //         createdAt: update.createdAt || new Date(), // Set `createdAt` if it doesn’t exist
    //       },
    //     },
    //   },
    // }))

    // await collection.bulkWrite(bulkOps) // Perform the bulk update
    // reordered.map(async (update) => {
    //   await collection.updateOne(
    //     { _id: update._id },
    //     {
    //       $set: {
    //         createdAt: update.createdAt,
    //       },
    //     }
    //   )
    // })

    await Promise.all(
      reordered.map((update) =>
        collection.updateOne(
          { _id: ObjectId.createFromHexString(update._id) },
          {
            $set: {
              position: update.position,
              createdAt: update.createdAt || new Date(),
            },
          }
        )
      )
    )
    return reordered
  } catch (err) {
    console.log(err)
    throw err
  }
}

function _buildCriteria(filterBy) {
  let criteria
  //   if (filterBy.isAll) {
  //     criteria = {}
  //   } else {
  //     criteria = {
  //       txt: { $regex: filterBy.txt, $options: 'i' },
  //       maxPrice: { $lt: filterBy.maxPrice },
  //       types: { $all: filterBy.types },
  //     }
  //   }

  //   return criteria
  return {}
}

function _buildSort(filterBy) {
  //   if (filterBy && filterBy.createdAt) {
  //     return { createdAt: -1 }
  //   }
  return { position: 1 } // Default case with no sorting if createdAt is not specified
}
