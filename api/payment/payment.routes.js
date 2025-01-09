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
} from './payment.controller.js'

const router = express.Router()

// We can add a middleware for the entire router:
// router.use(requireAuth)

router.post('/initiate', log, initiatePayment)
router.get('/success', log, successPayment)
router.post('/', log, addPayment)
router.get('/error', log, errorPayment)
router.post('/cancel', log, cancelPayment)

export const paymentRoutes = router
