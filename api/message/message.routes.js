import express from 'express'

import { requireAuth } from '../../middlewares/requireAuth.middleware.js'
import { log } from '../../middlewares/logger.middleware.js'
import { requireAdmin } from '../../middlewares/requireAuth.middleware.js'

import {
  getMessages,
  getMessageById,
  addMessage,
  updateMessage,
  removeMessage,
  getOpenMessages,
} from './message.controller.js'

const router = express.Router()

// We can add a middleware for the entire router:
// router.use(requireAuth)

router.get('/', log, requireAdmin, getMessages)
router.get('/openLength', log, requireAdmin, getOpenMessages)
router.get('/:id', log, requireAdmin, getMessageById)
router.post('/', log, addMessage) // letting anyone send message
router.put('/:id', requireAdmin, updateMessage)
router.delete('/:id', requireAdmin, removeMessage)
// router.delete('/:id', requireAuth, requireAdmin, removeMessage)

export const messageRoutes = router
