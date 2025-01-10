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

    if (!filterBy.isSkipPage && filterBy.pageIdx !== undefined) {
      classCursor.skip(filterBy.pageIdx * PAGE_SIZE).limit(PAGE_SIZE)
    }

    const classes = await classCursor.toArray()
    return classes
  } catch (err) {
    logger.error('cannot find classes', err)
    throw err
  }
}

// async function getOccurrences(filter) {
//   try {
//     const criteria = _buildCriteria(filter)
//     const sort = _buildSort(filter)

//     const collection = await dbService.getCollection('class')
//     var classCursor = await collection.find(criteria, { sort })

//     const classes = await classCursor.toArray()

//     const allOccurrences = []
//     await Promise.all(
//       classes.forEach((clas) => {
//         clas.occurrences.map((occur) => {
//           if (!occur.isActive) return
//           occur.title = clas.title
//           delete occur.time

//           // const trainers = []

//           //   if (trainers.some((trainer) => trainer.id === occur.trainer.id)) return

//           collection.aggregate([
//             {
//               $match: {},
//             },
//             {
//               $lookup: {
//                 from: 'trainer',
//                 localField: 'occur.trainer.id',
//                 foreignField: '_id',
//                 as: 'trainer',
//               },
//             },
//             {
//               $unwind: '$trainer', // Flatten trainerInfo array to get a single object
//             },
//           ])

//           // trainers.push(occur.trainer)

//           allOccurrences.push(occur)
//         })
//       })
//     )
//     allOccurrences.sort((item1, item2) => {
//       const from1 = convertToDate(item1.from)
//       const from2 = convertToDate(item2.from)
//       return from1 - from2
//     })
//     return allOccurrences
//   } catch (err) {
//     console.log(err)
//     throw err
//   }
// }

// import { ObjectId } from 'mongodb'
async function getOccurrences(filter) {
  try {
    const criteria = _buildCriteria()
    const sort = _buildSort(filter)

    const collection = await dbService.getCollection('class')
    const classCursor = await collection.find(criteria, { sort })
    const classes = await classCursor.toArray()

    const allOccurrences = []
    await Promise.all(
      classes.map(async (clas) => {
        // Loop through occurrences for each class
        for (const occur of clas.occurrences) {
          if (!occur.isActive) continue // Skip inactive occurrences
          if (filter.day && occur.day !== filter.day) continue

          occur.title = clas.title
          delete occur.time

          // Convert trainer.id from string to ObjectId
          const trainerId = new ObjectId(occur.trainer.id) // Use ObjectId constructor

          // Fetch trainer details via aggregation
          const trainerCollection = await dbService.getCollection('trainer')
          const trainerData = await trainerCollection
            .aggregate([
              {
                $match: { _id: trainerId }, // Match the trainer by its ID
              },
            ])
            .toArray()

          if (trainerData.length) {
            const id = occur.trainer.id
            occur.trainer = {
              id,
              name: trainerData[0].name,
            }
          } else {
            console.log(
              `No trainer found for occurrence: ${JSON.stringify(occur)}`
            )
          }

          allOccurrences.push(occur)
        }
      })
    )

    // Sort occurrences based on the "from" field (convert to Date)
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

async function getById(classId, filter) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(classId) }

    const collection = await dbService.getCollection('class')
    const clas = await collection.findOne(criteria)

    for (const occur of clas.occurrences) {
      if (!occur.isActive) continue // Skip inactive occurrences
      occur.title = clas.title
      delete occur.time

      // Convert trainer.id from string to ObjectId
      const trainerId = new ObjectId(occur.trainer.id) // Use ObjectId constructor

      // Fetch trainer details via aggregation
      const trainerCollection = await dbService.getCollection('trainer')
      const trainerData = await trainerCollection
        .aggregate([
          {
            $match: { _id: trainerId }, // Match the trainer by its ID
          },
        ])
        .toArray()

      if (trainerData.length) {
        const id = occur.trainer.id

        occur.trainer = {
          ...occur.trainer,
          name: trainerData[0].name,
        }
        console.log('afterChange:', occur.trainer)
      } else {
        console.log(`No trainer found for occurrence: ${JSON.stringify(occur)}`)
      }
    }

    await collection.updateOne(criteria, {
      $set: { ...clas, occurrences: clas.occurrences },
    })
    clas.createdAt = clas._id.getTimestamp()
    const modified = await _setNextPrevItemId(clas, filter)
    return modified
  } catch (err) {
    logger.error(`while finding class ${classId}`, err)
    throw err
  }
}

async function getTrainers(classId) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(classId) }

    const collection = await dbService.getCollection('class')
    const clas = await collection.findOne(criteria)

    const trainers = []

    clas.occurrences.forEach((occur) => {
      if (trainers.some((trainer) => trainer.id === occur.trainer.id)) return

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
  const criteria = {}

  //   const criteria = {
  //     txt: { $regex: filterBy.txt, $options: 'i' },
  //     maxPrice: { $lt: filterBy.maxPrice },
  //     types: { $all: filterBy.types },
  //   }

  //   return criteria
  return criteria
}

function _buildSort(filterBy) {
  //   return { [filterBy.maxPrice]: filterBy.sortDir }
  return {}
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
