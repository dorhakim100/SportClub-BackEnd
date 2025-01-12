import express from 'express'

import { requireAuth } from '../../middlewares/requireAuth.middleware.js'
import { requireAdmin } from '../../middlewares/requireAuth.middleware.js'
import { log } from '../../middlewares/logger.middleware.js'

import {
  initiatePayment,
  cancelPayment,
  successPayment,
  errorPayment,
  addPayment,
  getPayments,
  updatePayment,
  getOpenPayments,
} from './payment.controller.js'

const router = express.Router()

// We can add a middleware for the entire router:
// router.use(requireAuth)

router.get('/', requireAuth, getPayments)
router.post('/initiate', log, initiatePayment)
router.post('/add', log, addPayment)
router.put('/:id', requireAdmin, updatePayment)
router.get('/openLength', log, getOpenPayments)

router.get('/success', log, successPayment)
router.get('/error', log, errorPayment)
router.post('/cancel', log, cancelPayment)

export const paymentRoutes = router
