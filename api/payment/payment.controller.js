import { logger } from '../../services/logger.service.js'
import { paymentService } from './payment.services.js'

export async function initiatePayment(req, res) {
  try {
    const { amount, orderId, goodUrl, badUrl, user, items } = req.body
    const order = {
      amount,
      orderId,
      goodUrl,
      badUrl,
      user,
      items,
    }
    const loggedinUser = req.body.user

    if (!loggedinUser) return res.status(401).send('Not Authenticated')

    const response = await paymentService.getLink(order)

    if (response && response.URL) {
      res.status(200).json({ paymentUrl: response.URL })
    } else {
      res.status(400).json({ error: 'Failed to initiate payment' })
    }
  } catch (err) {
    logger.error('Failed to initiate payment', err)
    res.status(400).send({ err: 'Failed to initiate payment' })
  }
}

export async function addPayment(req, res) {
  try {
    const { loggedinUser, body: payment } = req

    const updatedUser = await paymentService.savePayment(payment)
    if (updatedUser) res.json(updatedUser)
  } catch (err) {
    logger.error('Failed to save payment', err)
    res.status(400).send({ err: 'Failed to save payment' })
  }
}

export async function successPayment(req, res) {
  try {
    console.log('success:', req)
    const { ConfirmationKey, UniqueKey, Total } = req.query

    if (!ConfirmationKey || !UniqueKey || !Total) {
      return res.status(400).send('Missing required payment details.')
    }

    // Save transaction details to your database
    const transactionData = {
      uniqueKey: UniqueKey,
      confirmationKey: ConfirmationKey,
      amount: parseInt(Total, 10),
      status: 'PENDING',
      createdAt: new Date(),
    }

    const savedTransaction = await paymentService.saveTransaction(
      transactionData
    )

    // Optionally verify the transaction with Pelecard
    const verification = await paymentService.verifyTransaction(
      UniqueKey,
      Total
    )

    if (verification.success) {
      await paymentService.updateTransactionStatus(
        savedTransaction._id,
        'SUCCESS'
      )
    } else {
      await paymentService.updateTransactionStatus(
        savedTransaction._id,
        'FAILED'
      )
      return res.redirect('/payment-failed')
    }

    // Redirect the user to a success page
    res.redirect('/payment-success')
  } catch (err) {
    logger.error('Failed to save payment', err)
    res.status(400).send({ err: 'Failed to save payment' })
  }
}

export async function errorPayment(req, res) {
  try {
    const { ConfirmationKey, UniqueKey, Total } = req.query

    if (!ConfirmationKey || !UniqueKey) {
      return res.status(400).send('Missing required payment details.')
    }

    // Optionally save the failed transaction attempt
    const transactionData = {
      uniqueKey: UniqueKey,
      confirmationKey: ConfirmationKey,
      amount: parseInt(Total, 10),
      status: 'FAILED',
      createdAt: new Date(),
    }

    await paymentService.saveTransaction(transactionData)

    // Redirect the user to a failure page
    res.redirect('/payment-failed')
  } catch (err) {
    console.error('Error processing failed payment callback:', err)
    res.status(500).send('An error occurred.')
  }
}

export async function cancelPayment(req, res) {
  try {
    const { confirmationKey, uniqueKey, total } = req.body

    if (!confirmationKey || !uniqueKey || !total) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    const response = await paymentService.cancelTransaction({
      confirmationKey,
      uniqueKey,
      total,
    })

    if (response && response.success) {
      res.status(200).json({ message: 'Payment successfully canceled' })
    } else {
      res.status(400).json({ error: 'Failed to cancel payment' })
    }
  } catch (err) {
    logger.error('Failed to cancel payment', err)
    res.status(500).send({ error: 'Failed to cancel payment' })
  }
}
