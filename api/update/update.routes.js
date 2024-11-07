import express from 'express'

import { requireAuth } from '../../middlewares/requireAuth.middleware.js'
import { log } from '../../middlewares/logger.middleware.js'

import {
  getUpdates,
  getUpdateById,
  addUpdate,
  updateUpdate,
  removeUpdate,
  reorderUpdates,
} from './update.controller.js'

const router = express.Router()

// We can add a middleware for the entire router:
// router.use(requireAuth)

router.get('/', log, getUpdates)
router.put('/reorder', log, reorderUpdates)
router.get('/:id', log, getUpdateById)
router.post('/', log, requireAuth, addUpdate)
router.put('/:id', requireAuth, updateUpdate)
router.delete('/:id', requireAuth, removeUpdate)
// router.delete('/:id', requireAuth, requireAdmin, removeUpdate)

export const updateRoutes = router
