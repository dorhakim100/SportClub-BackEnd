import { dbService } from '../../services/db.service.js'
import { logger } from '../../services/logger.service.js'

import { ObjectId } from 'mongodb'
import Cryptr from 'cryptr'

import bcrypt from 'bcrypt'
const cryptr = new Cryptr(process.env.SECRET || 'Secret-Puk-1234')
const PAGE_SIZE = 6

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
    var userCursor = await collection.find(criteria)
    if (filterBy.pageIdx !== undefined && !filterBy.isAll) {
      userCursor.skip(filterBy.pageIdx * PAGE_SIZE).limit(PAGE_SIZE)
    }

    let users = await userCursor.toArray()

    if (filterBy.isMax) {
      let maxPage = users.length / PAGE_SIZE
      maxPage = Math.ceil(maxPage)

      return maxPage
    }

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
  const saltRounds = 10

  try {
    // peek only updatable properties
    const userToSave = {
      _id: ObjectId.createFromHexString(user._id), // needed for the returnd obj
      fullname: user.fullname,
      items: user.items,
      ordersIds: user.ordersIds,
      phone: user.phone,
      imgUrl: user.imgUrl,
      memberStatus: user.memberStatus,
    }
    let hash
    if (user.password) {
      hash = await bcrypt.hash(user.password, saltRounds)
      userToSave.password = hash
    }
    const collection = await dbService.getCollection('user')
    await collection.updateOne({ _id: userToSave._id }, { $set: userToSave })
    const userToSend = collection.findOne({ _id: userToSave._id })

    return userToSend
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
      phone: user.phone,
      memberStatus: {
        isMember: false,
        expiry: '',
      },
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

  if (filterBy.onlyMembers) {
    criteria['memberStatus.isMember'] = { $eq: true }
  }
  if (filterBy.calledUserId) {
    criteria._id = { $ne: ObjectId.createFromHexString(filterBy.calledUserId) }
  }

  return criteria
}
