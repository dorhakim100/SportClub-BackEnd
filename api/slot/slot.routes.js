import express from 'express'

import {
  requireAdmin,
} from '../../middlewares/requireAuth.middleware.js'
import {
  getSlots,
  createSlot,
  registerToSlot,
} from './slot.controller.js'

const router = express.Router()

router.get('/',getSlots)
router.post('/', requireAdmin, createSlot)
router.put('/:id/register', registerToSlot)

export const slotRoutes = router

