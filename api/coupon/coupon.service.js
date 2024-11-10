import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'

const PAGE_SIZE = 6

export const couponService = {
  remove,
  query,
  getById,
  add,
  update,
  getDiscount,
}

async function query(filterBy = { txt: '' }) {
  try {
    const criteria = _buildCriteria(filterBy)
    const sort = _buildSort(filterBy)

    const collection = await dbService.getCollection('coupon')
    var couponCursor = await collection.find(criteria, { sort })

    if (filterBy.pageIdx !== undefined && !filterBy.isAll) {
      couponCursor.skip(filterBy.pageIdx * PAGE_SIZE).limit(PAGE_SIZE)
    }

    const coupons = couponCursor.toArray()
    return coupons
  } catch (err) {
    logger.error('cannot find coupons', err)
    throw err
  }
}

async function getById(couponId) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(couponId) }

    const collection = await dbService.getCollection('coupon')
    const coupon = await collection.findOne(criteria)

    coupon.createdAt = coupon._id.getTimestamp()
    return coupon
  } catch (err) {
    logger.error(`while finding coupon ${couponId}`, err)
    throw err
  }
}

async function remove(couponId) {
  const { loggedinUser } = asyncLocalStorage.getStore()
  const { _id: ownerId, isAdmin } = loggedinUser

  try {
    const criteria = {
      _id: ObjectId.createFromHexString(couponId),
    }
    if (!isAdmin) criteria['owner._id'] = ownerId

    const collection = await dbService.getCollection('coupon')
    const res = await collection.deleteOne(criteria)

    if (res.deletedCount === 0) throw 'Not your coupon'
    return couponId
  } catch (err) {
    logger.error(`cannot remove coupon ${couponId}`, err)
    throw err
  }
}

async function add(coupon) {
  try {
    const collection = await dbService.getCollection('coupon')
    await collection.insertOne(coupon)

    return coupon
  } catch (err) {
    logger.error('cannot insert coupon', err)
    throw err
  }
}

async function update(coupon) {
  const couponToSave = {
    title: coupon.title,
    code: coupon.code,
    amount: coupon.amount,
    isActive: coupon.isActive,
    type: coupon.type,
    items: coupon.items,
  }

  try {
    const criteria = { _id: ObjectId.createFromHexString(coupon._id) }

    const collection = await dbService.getCollection('coupon')
    await collection.updateOne(criteria, { $set: couponToSave })

    return coupon
  } catch (err) {
    logger.error(`cannot update coupon ${coupon._id}`, err)
    throw err
  }
}

async function getDiscount(couponCode) {
  try {
    const criteria = _buildCriteria({ code: couponCode })
    // const sort = _buildSort()

    const collection = await dbService.getCollection('coupon')
    const coupon = await collection.findOne(criteria)

    if (coupon) {
      return { amount: coupon.amount, type: coupon.type, items: coupon.items }
    } else {
      throw new Error(`Couldn't find coupon`)
    }
  } catch (err) {
    console.log(err)
    throw err
  }
}

function _buildCriteria(filterBy) {
  let criteria = {}
  if (filterBy.isAll) {
    criteria = {}
  }
  if (filterBy.allActive) {
    criteria.isActive = { $eq: true }
  }
  if (filterBy.code) {
    console.log(filterBy)
    criteria.code = filterBy.code
  }

  return criteria
}

function _buildSort(filterBy) {
  //   return { [filterBy.maxPrice]: filterBy.sortDir }
  return {}
}
