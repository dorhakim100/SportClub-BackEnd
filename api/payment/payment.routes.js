import express from 'express'

import { requireAuth } from '../../middlewares/requireAuth.middleware.js'
import { requireAdmin } from '../../middlewares/requireAuth.middleware.js'
import { log } from '../../middlewares/logger.middleware.js'

import {
  addPayment,
  cancelPayment,
  successPayment,
  errorPayment,
} from './payment.controller.js'

const router = express.Router()

// We can add a middleware for the entire router:
// router.use(requireAuth)

router.post('/initiate', log, addPayment)
router.get('/success', log, successPayment)
router.get('/error', log, errorPayment)
router.post('/cancel', log, cancelPayment)

export const paymentRoutes = router
