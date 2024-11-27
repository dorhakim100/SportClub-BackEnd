import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'
import { convertToDate } from '../../services/util.service.js'

export const paymentService = {
  getLink,
  cancelTransaction,
  saveTransaction,
  updateTransactionStatus,
  verifyTransaction,
}

async function getLink(order) {
  const paymentRequest = {
    terminal: process.env.PELECARD_TERMINAL,
    user: process.env.PELECARD_USER,
    password: process.env.PELECARD_PASSWORD,
    GoodURL: 'https://your-site.com/success', // add url!!
    ErrorURL: 'https://your-site.com/error', // add url!!
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

    return result
  } catch (err) {
    logger.error('cannot find classes', err)
    throw err
  }
}

async function saveTransaction(transaction) {
  // Get the database collection
  const collection = await dbService.getCollection('transactions') // "transactions" is your MongoDB collection

  try {
    // Insert the transaction data into the database
    const result = await collection.insertOne(transaction)

    // Return the saved transaction document
    return result.ops[0] // Return the saved transaction object
  } catch (err) {
    console.error('Error saving transaction:', err)
    throw new Error('Failed to save transaction')
  }
}

async function updateTransactionStatus(transactionId, status) {
  const collection = await dbService.getCollection('transactions')

  try {
    const updatedTransaction = await collection.updateOne(
      { _id: transactionId },
      { $set: { status } } // Update the status of the transaction
    )
    return updatedTransaction
  } catch (err) {
    console.error('Error updating transaction status:', err)
    throw new Error('Failed to update transaction status')
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
