import { dbService } from '../../services/db.service.js'
import { logger } from '../../services/logger.service.js'

import { ObjectId } from 'mongodb'

export const userService = {
  add, // Create (Signup)
  getById, // Read (Profile page)
  update, // Update (Edit profile)
  remove, // Delete (remove user)
  query, // List (of users)
  getByUsername, // Used for Login
}

async function query(filterBy = {}) {
  const criteria = _buildCriteria(filterBy)
  try {
    const collection = await dbService.getCollection('user')
    var users = await collection.find(criteria).toArray()
    users = users.map((user) => {
      delete user.password
      user.createdAt = user._id.getTimestamp()
      // Returning fake fresh data
      // user.createdAt = Date.now() - (1000 * 60 * 60 * 24 * 3) // 3 days ago
      return user
    })
    return users
  } catch (err) {
    logger.error('cannot find users', err)
    throw err
  }
}

async function getById(userId) {
  try {
    var criteria = { _id: ObjectId.createFromHexString(userId) }

    const collection = await dbService.getCollection('user')
    const user = await collection.findOne(criteria)
    delete user.password

    criteria = { byUserId: userId }

    // later, add orders
    // user.givenReviews = await reviewService.query(criteria)
    // user.givenReviews = user.givenReviews.map(review => {
    //     delete review.byUser
    //     return review
    // })

    return user
  } catch (err) {
    logger.error(`while finding user by id: ${userId}`, err)
    throw err
  }
}

async function getByUsername(usernameOrEmail, signUpEmail) {
  try {
    const collection = await dbService.getCollection('user')
    // Use $or to check both username and email
    let user
    if (signUpEmail) {
      user = await collection.findOne({
        $or: [
          { username: usernameOrEmail },
          { email: usernameOrEmail },
          { email: signUpEmail },
        ],
      })
    } else {
      user = await collection.findOne({
        $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
      })
    }

    return user
  } catch (err) {
    logger.error(`while finding user by username: ${usernameOrEmail}`, err)
    throw err
  }
}

async function remove(userId) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(userId) }

    const collection = await dbService.getCollection('user')
    await collection.deleteOne(criteria)
  } catch (err) {
    logger.error(`cannot remove user ${userId}`, err)
    throw err
  }
}

async function update(user) {
  try {
    // peek only updatable properties
    const userToSave = {
      _id: ObjectId.createFromHexString(user._id), // needed for the returnd obj
      fullname: user.fullname,
      score: user.score,
    }
    const collection = await dbService.getCollection('user')
    await collection.updateOne({ _id: userToSave._id }, { $set: userToSave })
    return userToSave
  } catch (err) {
    logger.error(`cannot update user ${user._id}`, err)
    throw err
  }
}

async function add(user) {
  try {
    // peek only updatable fields!
    const userToAdd = {
      fullname: user.fullname,
      username: user.username,
      isAdmin: user.isAdmin,
      email: user.email,
      password: user.password,
      ordersIds: user.ordersIds,
      items: user.items,
    }
    const collection = await dbService.getCollection('user')
    await collection.insertOne(userToAdd)
    return userToAdd
  } catch (err) {
    logger.error('cannot add user', err)
    throw err
  }
}

function _buildCriteria(filterBy) {
  const criteria = {}
  if (filterBy.txt) {
    const txtCriteria = { $regex: filterBy.txt, $options: 'i' }
    criteria.$or = [
      {
        username: txtCriteria,
      },
      {
        fullname: txtCriteria,
      },
    ]
  }
  if (filterBy.minBalance) {
    criteria.score = { $gte: filterBy.minBalance }
  }
  return criteria
}
