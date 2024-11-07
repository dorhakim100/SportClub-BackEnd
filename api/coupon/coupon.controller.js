import { logger } from '../../services/logger.service.js'
import { couponService } from './coupon.service.js'

export async function getCoupons(req, res) {
  try {
    const filterBy = {
      txt: req.query.txt || '',
      allActive: req.query.allActive || false,
      pageIdx: req.query.pageIdx,
      isAll: req.query.isAll || false,
    }
    const coupons = await couponService.query(filterBy)
    res.json(coupons)
  } catch (err) {
    logger.error('Failed to get coupons', err)
    res.status(400).send({ err: 'Failed to get coupons' })
  }
}

export async function checkDiscount(req, res) {
  try {
    const couponCode = req.query

    const result = await couponService.getDiscount(couponCode)

    res.json(result)
  } catch (err) {
    console.log(err)
    throw err
  }
}

export async function getCouponById(req, res) {
  try {
    const couponId = req.params.id
    const coupon = await couponService.getById(couponId)
    res.json(coupon)
  } catch (err) {
    logger.error('Failed to get coupon', err)
    res.status(400).send({ err: 'Failed to get coupon' })
  }
}

export async function addCoupon(req, res) {
  const { loggedinUser, body: coupon } = req

  try {
    coupon.owner = loggedinUser
    const addedCoupon = await couponService.add(coupon)
    res.json(addedCoupon)
  } catch (err) {
    logger.error('Failed to add coupon', err)
    res.status(400).send({ err: 'Failed to add coupon' })
  }
}

export async function updateCoupon(req, res) {
  const { loggedinUser, body: coupon } = req
  const { _id: userId, isAdmin } = loggedinUser

  if (!isAdmin && coupon.owner._id !== userId) {
    res.status(403).send('Not your coupon...')
    return
  }

  try {
    const updatedCoupon = await couponService.update(coupon)
    res.json(updatedCoupon)
  } catch (err) {
    logger.error('Failed to update coupon', err)
    res.status(400).send({ err: 'Failed to update coupon' })
  }
}

export async function removeCoupon(req, res) {
  try {
    const couponId = req.params.id
    const removedId = await couponService.remove(couponId)

    res.send(removedId)
  } catch (err) {
    logger.error('Failed to remove coupon', err)
    res.status(400).send({ err: 'Failed to remove coupon' })
  }
}
