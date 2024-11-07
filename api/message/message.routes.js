import express from 'express'

import { requireAuth } from '../../middlewares/requireAuth.middleware.js'
import { log } from '../../middlewares/logger.middleware.js'

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

router.get('/', log, getMessages)
router.get('/openLength', log, getOpenMessages)
router.get('/:id', log, getMessageById)
router.post('/', log, requireAuth, addMessage)
router.put('/:id', requireAuth, updateMessage)
router.delete('/:id', requireAuth, removeMessage)
// router.delete('/:id', requireAuth, requireAdmin, removeMessage)

export const messageRoutes = router
