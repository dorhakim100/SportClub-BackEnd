import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'
import { convertToDate } from '../../services/util.service.js'

export const paymentService = {
  getLink,
  savePayment,
  query,
  queryOpen,
  update,
  cancelTransaction,
  verifyTransaction,
}

const PAGE_SIZE = 6

const Render_GoodURL = 'https://sportclub-kfar.onrender/payment/success'
const Render_ErrorURL = 'https://sportclub-kfar.onrender/payment/error'

async function getLink(order) {
  const cart = { items: order.items, amount: order.amount }

  const paymentRequest = {
    terminal: process.env.PELECARD_TERMINAL,
    user: process.env.PELECARD_USERNAME_DEMO,
    password: process.env.PELECARD_PASSWORD_DEMO,
    // user: process.env.PELECARD_USERNAME,
    // password: process.env.PELECARD_PASSWORD,
    // GoodURL: order.goodUrl, // add url!!
    // ErrorURL: order.badUrl, // add url!!
    GoodURL: Render_GoodURL,
    ErrorURL: Render_ErrorURL,
    // GoodURL: 'http://localhost:5173/payment/success',
    // ErrorURL: 'http://localhost:5173/payment/error',

    UserKey: order.user.id,

    ParamX: JSON.stringify(cart), // Sending the object of cart as a JSON string

    Total: (order.amount * 100).toString(), // Amount in Agorot
    Currency: '1',
    ActionType: 'J4',
  }
  try {
    const response = await fetch(
      'https://gateway21.pelecard.biz/PaymentGW/init',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentRequest),
      }
    )

    if (!response.ok) {
      const errorDetails = await response.json()
      throw new Error(
        `Pelecard API Error: ${errorDetails.error || response.statusText}`
      )
    }

    const result = await response.json()
    logger.info('Payment link successfully retrieved:', result)

    // return response
    return result
  } catch (err) {
    logger.error('cannot find classes', err)
    throw err
  }
}

async function savePayment(payment) {
  try {
    const collection = await dbService.getCollection('payment')

    const isExists = await collection.findOne({
      pelecardTransactionId: payment.pelecardTransactionId,
    })

    if (!isExists) {
      let count = await collection.countDocuments() // Efficient way to get the document count
      console.log('count', count)
      const orderNum = ++count
      console.log('num:', orderNum)

      const userCollection = await dbService.getCollection('user')

      const userIdCriteria = {
        _id: ObjectId.createFromHexString(payment.userId),
      }

      const user = await userCollection.findOne(userIdCriteria)

      const paymentToSave = {
        ...payment,
        orderNum: orderNum,
        createdAt: Date.now(),
        isReady: false,
        user: {
          id: payment.userId,
          fullname: user.fullname,
          phone: user.phone,
        },
      }
      delete paymentToSave.userId

      const result = await collection.insertOne(paymentToSave)
      const stringPaymentId = result.insertedId.toString()

      const ordersIds = user.ordersIds
      ordersIds.unshift(stringPaymentId)
      const userToReturn = { ...user, items: [], ordersIds: ordersIds }

      const updatedUser = await userCollection.updateOne(userIdCriteria, {
        $set: { ordersIds: userToReturn.ordersIds },
        $set: { items: [] },
      })
      // delete userToReturn.password
      // return userToReturn
      return paymentToSave
    }
  } catch (err) {
    console.error('Error saving payment:', err)
    throw new Error('Failed to save payment')
  }
}

async function query(filterBy = { txt: '' }) {
  try {
    const criteria = _buildCriteria(filterBy)
    const sort = _buildSort(filterBy)

    const collection = await dbService.getCollection('payment')
    var paymentCursor = await collection.find(criteria, { sort })

    if (filterBy.pageIdx !== undefined && !filterBy.isAll) {
      paymentCursor.skip(filterBy.pageIdx * PAGE_SIZE).limit(PAGE_SIZE)
    }

    const payments = paymentCursor.toArray()
    return payments
  } catch (err) {
    logger.error('cannot find payments', err)
    throw err
  }
}

async function queryOpen() {
  try {
    const criteria = _buildCriteria({ onlyPending: true })
    const sort = {}

    const collection = await dbService.getCollection('payment')
    var paymentCursor = await collection.find(criteria, { sort })

    const payments = await paymentCursor.toArray()
    return payments.length
  } catch (err) {
    logger.error('cannot find payments', err)
    throw err
  }
}
async function update(paymentToSave) {
  try {
    const collection = await dbService.getCollection('payment')

    const paymentIdCriteria = {
      _id: ObjectId.createFromHexString(paymentToSave._id),
    }
    delete paymentToSave._id

    await collection.updateOne(paymentIdCriteria, { $set: paymentToSave })
    return paymentToSave
  } catch (err) {
    console.error('Error updating payment status:', err)
    throw new Error('Failed to update payment status')
  }
}

function _buildCriteria(filterBy) {
  let criteria = {}
  if (filterBy.isAll) {
    criteria = {}
  }
  if (filterBy.onlyPending) {
    criteria.isReady = { $eq: false }
  }
  if (filterBy.txt) {
    const txtCriteria = { $regex: filterBy.txt, $options: 'i' }
    const orderNumCriteria = { orderNum: { $eq: parseInt(filterBy.txt) } }

    criteria = {
      $or: [
        orderNumCriteria,
        { 'user.fullname': txtCriteria },
        { 'user.phone': txtCriteria },
      ],
    }
  }
  if (filterBy.isAdmin) {
    // criteria._id = { $in: [] }
    return criteria
  }
  if (filterBy.ordersIds) {
    // If filterBy.ordersIds is a single string ID, make sure to convert it to an array
    const orderIds = Array.isArray(filterBy.ordersIds)
      ? filterBy.ordersIds.map((id) => new ObjectId(id)) // If it's already an array, convert each item to ObjectId
      : [new ObjectId(filterBy.ordersIds)] // If it's a single ID, wrap it in an array

    criteria._id = { $in: orderIds } // Use the $in operator to match any of the order IDs
  }

  return criteria
}

function _buildSort(filterBy) {
  console.log(filterBy)
  if (filterBy.sortDir === '1') {
    return { createdAt: -1 }
  } else {
    return { createdAt: 1 }
  }
}

async function verifyTransaction(uniqueKey, total) {
  const verificationRequest = {
    UniqueKey: uniqueKey,
    TotalX100: (total * 100).toString(), // Pelecard expects the total in agorot (i.e., total * 100)
  }

  try {
    // Call Pelecard's ValidateByUniqueKey API endpoint
    const response = await fetch(
      'https://gateway21.pelecard.biz/PaymentGW/ValidateByUniqueKey',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verificationRequest),
      }
    )

    // Parse the JSON response
    const result = await response.json()

    if (response.ok) {
      // Successful verification, return the result or any necessary info
      logger.info('Payment verified successfully:', result)
      return { success: true, result } // Return true for successful verification
    } else {
      // If the API call wasn't successful, log and handle the error
      logger.error('Failed to verify payment:', result)
      return {
        success: false,
        error: result.error || 'Failed to verify payment',
      }
    }
  } catch (err) {
    // Catch any network errors or exceptions
    logger.error('Error verifying payment:', err)
    throw new Error('Error verifying payment')
  }
}

async function cancelTransaction({ confirmationKey, uniqueKey, total }) {
  const cancelRequest = {
    ConfirmationKey: confirmationKey,
    UniqueKey: uniqueKey,
    TotalX100: (total * 100).toString(),
  }

  try {
    const response = await fetch(
      'https://gateway21.pelecard.biz/PaymentGW/Cancel',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cancelRequest),
      }
    )

    const result = await response.json()

    if (response.ok) {
      return { success: true, ...result }
    } else {
      logger.error('Cancellation failed:', result)
      throw new Error(result.error || 'Failed to cancel payment')
    }
  } catch (err) {
    logger.error('Error canceling transaction:', err)
    throw err
  }
}
