import express from 'express'

import { requireAuth } from '../../middlewares/requireAuth.middleware.js'
import { log } from '../../middlewares/logger.middleware.js'
import { requireAdmin } from '../../middlewares/requireAuth.middleware.js'

import {
  getUpdates,
  getUpdateById,
  addUpdate,
  updateUpdate,
  removeUpdate,
  reorderUpdates,
  getMessageUpdate,
} from './update.controller.js'

const router = express.Router()

// We can add a middleware for the entire router:
// router.use(requireAuth)

router.get('/', log, getUpdates)
router.get('/messageUpdate', log, getMessageUpdate)
router.put('/reorder', log, requireAdmin, reorderUpdates)
router.get('/:id', log, getUpdateById)
router.post('/', log, requireAdmin, addUpdate)
router.put('/:id', requireAdmin, updateUpdate)
router.delete('/:id', requireAdmin, removeUpdate)
// router.delete('/:id', requireAuth, requireAdmin, removeUpdate)

export const updateRoutes = router
