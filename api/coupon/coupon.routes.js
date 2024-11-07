import express from 'express'

import { requireAuth } from '../../middlewares/requireAuth.middleware.js'
import { log } from '../../middlewares/logger.middleware.js'

import {
  getCoupons,
  getCouponById,
  addCoupon,
  updateCoupon,
  removeCoupon,
  checkDiscount,
} from './coupon.controller.js'

const router = express.Router()

// We can add a middleware for the entire router:
// router.use(requireAuth)

router.get('/', log, getCoupons)
router.get('/allActive', log, checkDiscount)
router.get('/:id', log, getCouponById)
router.post('/', log, requireAuth, addCoupon)
router.put('/:id', requireAuth, updateCoupon)
router.delete('/:id', requireAuth, removeCoupon)
// router.delete('/:id', requireAuth, requireAdmin, removeCoupon)

export const couponRoutes = router
