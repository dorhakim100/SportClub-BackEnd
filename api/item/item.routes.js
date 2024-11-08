import express from 'express'

import { requireAuth } from '../../middlewares/requireAuth.middleware.js'
import { log } from '../../middlewares/logger.middleware.js'
import { requireAdmin } from '../../middlewares/requireAuth.middleware.js'

import {
  getItems,
  getItemById,
  addItem,
  updateItem,
  removeItem,
  getCartItems,
} from './item.controller.js'

const router = express.Router()

// We can add a middleware for the entire router:
// router.use(requireAuth)

router.get('/', log, getItems)
router.get('/cart', log, getCartItems)
router.get('/:id', log, getItemById)
router.post('/', log, requireAdmin, addItem)
router.put('/:id', requireAdmin, updateItem)
router.delete('/:id', requireAdmin, removeItem)
// router.delete('/:id', requireAuth, requireAdmin, removeItem)

export const itemRoutes = router
