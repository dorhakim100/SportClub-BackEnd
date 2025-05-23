import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'
import { convertToDate } from '../../services/util.service.js'
import { notifyService } from '../../services/notify.service.js'
import { couponService } from '../coupon/coupon.service.js'
import { userService } from '../user/user.service.js'

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
// const GoodURL = 'http://localhost:5173/payment/success'
// const ErrorURL = 'http://localhost:5173/payment/error'
const GoodURL = 'https://www.moadonsport.com/payment/success'
const ErrorURL = 'https://www.moadonsport.com/payment/error'

async function getLink(order, loggedinUser) {
  try {
    const returnedUser = await userService.getById(loggedinUser.id)

    const isMember =
      returnedUser.memberStatus.isMember &&
      returnedUser.memberStatus.expiry > Date.now()
        ? true
        : false
    if (isMember) {
      order.items.forEach((item) => {
        if (item.types.includes('card')) {
          const idx = order.items.findIndex(
            (cartItem) => cartItem.id === item.id
          )
          let itemToModify = order.items[idx]

          itemToModify = {
            ...itemToModify,
            price: 500,
            isDiscount: true,
          }
          order.items.splice(idx, 1, itemToModify)
        }
      })
    } else if (order.coupon && order.coupon !== '') {
      const discount = await couponService.getDiscount(order.coupon)
      order.items.forEach((item) => {
        const matchedDiscountItem = discount.items.find(
          (itemToCheck) => itemToCheck.id === item.id
        )

        if (!matchedDiscountItem) return // Skip if no match is found

        const idx = order.items.findIndex((cartItem) => cartItem.id === item.id)
        let itemToModify = order.items[idx]

        if (discount.type === 'fixed') {
          itemToModify = {
            ...itemToModify,
            price: itemToModify.price - discount.amount,
            isDiscount: true,
          }
        }

        if (discount.type === 'percentage') {
          itemToModify = {
            ...itemToModify,
            price:
              itemToModify.price - itemToModify.price * (discount.amount / 100),
            isDiscount: true,
          }
        }

        order.items.splice(idx, 1, itemToModify)
      })
    }
    let total = 0
    const cartTotal = order.items.reduce(
      (accu, item) => accu + item.price * item.quantity,
      total
    )
    const cart = { items: order.items, amount: cartTotal }

    const paymentRequest = {
      // terminal: process.env.PELECARD_TERMINAL_DEMO,
      // user: process.env.PELECARD_USERNAME_DEMO,
      // password: process.env.PELECARD_PASSWORD_DEMO,
      terminal: process.env.PELECARD_TERMINAL,
      user: process.env.PELECARD_USERNAME,
      password: process.env.PELECARD_PASSWORD,
      GoodURL: GoodURL,
      ErrorURL: ErrorURL,
      //
      // GoodURL: Render_GoodURL,
      // ErrorURL: Render_ErrorURL,
      // demo urls ^
      // GoodURL: 'http://localhost:5173/payment/success',
      // ErrorURL: 'http://localhost:5173/payment/error',

      UserKey: order.user.id,

      ParamX: JSON.stringify(cart), // Sending the object of cart as a JSON string

      Total: (order.amount * 100).toString(), // Amount in Agorot
      Currency: '1',
      ActionType: 'J4',
    }
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

    if (isExists) throw new Error('Failed to save payment')

    let count = await collection.countDocuments() // Efficient way to get the document count
    const countLength = count.toString().length
    let orderNum = ++count
    switch (countLength) {
      case 1:
        orderNum = '000' + count
        break
      case 2:
        orderNum = '00' + count
        break
      case 3:
        orderNum = '0' + count
        break

      default:
        break
    }

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
    const pipeline = [
      {
        $match: { ...criteria, 'user.id': { $ne: '673097c52964d2be56fdd6e8' } },
      },

      // Build allOptionIds from items' options if needed
      {
        $addFields: {
          allOptionIds: {
            $reduce: {
              input: '$items',
              initialValue: [],
              in: {
                $concatArrays: [
                  '$$value',
                  {
                    $filter: {
                      input: '$$this.options',
                      as: 'opt',
                      cond: { $ne: ['$$opt', null] },
                    },
                  },
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          allOptionIds: {
            $map: {
              input: '$allOptionIds',
              as: 'opt',
              in: { $toObjectId: '$$opt' },
            },
          },
        },
      },
      // Lookup matching option documents for all option ids
      {
        $lookup: {
          from: 'option',
          localField: 'allOptionIds',
          foreignField: '_id',
          as: 'optionsData',
        },
      },
      // Replace each item's options with the corresponding option objects
      {
        $project: {
          _id: 1,
          pelecardTransactionId: 1,
          amount: 1,
          orderNum: 1,
          createdAt: 1,
          isReady: 1,
          isDelivered: 1,
          user: 1,
          items: {
            $map: {
              input: '$items',
              as: 'item',
              in: {
                title: '$$item.title',
                price: '$$item.price',
                cover: '$$item.cover',
                id: '$$item.id',
                quantity: '$$item.quantity',
                options: {
                  $map: {
                    input: '$$item.options',
                    as: 'optId',
                    in: {
                      $let: {
                        vars: {
                          converted: {
                            $cond: [
                              { $ne: ['$$optId', null] },
                              { $toObjectId: '$$optId' },
                              null,
                            ],
                          },
                          optionObj: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: '$optionsData',
                                  as: 'opt',
                                  cond: {
                                    $eq: [
                                      '$$opt._id',
                                      { $toObjectId: '$$optId' },
                                    ],
                                  },
                                },
                              },
                              0,
                            ],
                          },
                        },
                        in: {
                          $cond: [
                            { $ifNull: ['$$optionObj', false] },
                            {
                              id: '$$optionObj._id',
                              title: '$$optionObj.title',
                            },
                            null,
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // Add sorting stage
      { $sort: sort },
    ]

    // If pagination is needed
    if (filterBy.pageIdx !== undefined && !filterBy.isAll) {
      pipeline.push(
        { $skip: filterBy.pageIdx * PAGE_SIZE },
        { $limit: PAGE_SIZE }
      )
    }

    const payments = await collection.aggregate(pipeline).toArray()

    if (filterBy.isMax) {
      let maxPage = payments.length / PAGE_SIZE
      maxPage = Math.ceil(maxPage)

      return maxPage
    }

    const modifiedPayments = _modifyPaymentOptions(payments)

    return modifiedPayments
  } catch (err) {
    logger.error('cannot find payments', err)
    throw err
  }
}

function _modifyPaymentOptions(payments) {
  const modified = payments.map((payment) => {
    const modifiedItems = payment.items.map((item) => {
      if (!item.options) return { ...item, options: [] }
      if (!item.options[0]) return { ...item, options: [] }

      const frequency = item.options.reduce((accu, option) => {
        const { id } = option

        accu[id] ? accu[id]++ : (accu[id] = 1)

        return accu
      }, {})

      const options = Object.keys(frequency).map((key) => {
        return {
          id: key,
          quantity: frequency[key],
          title: item.options.find(
            (optionToFind) => optionToFind.id.toString() === key
          ).title,
        }
      })

      return { ...item, options }
    })
    return { ...payment, items: modifiedItems }
  })
  return modified
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
    const originalPayment = await collection.findOne(paymentIdCriteria)

    const originalItems = originalPayment.items
    await collection.updateOne(paymentIdCriteria, {
      $set: { ...paymentToSave, items: originalItems },
    })
    if (paymentToSave.isReady && !paymentToSave.isDelivered) {
      const name = `${paymentToSave.user.fullname}`

      notifyService.sendWhatsAppNotification(
        { name, orderNumber: paymentToSave.orderNum },
        process.env.ADMIN_WHATSAPP_FROM,
        paymentToSave.user.phone
      )
    }
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
