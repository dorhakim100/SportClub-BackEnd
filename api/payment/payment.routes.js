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

router.post('/initiate', log, requireAuth, addPayment)
router.get('/success', log, requireAuth, successPayment)
router.get('/error', log, requireAuth, errorPayment)
router.post('/cancel', log, requireAuth, cancelPayment)

export const paymentRoutes = router
