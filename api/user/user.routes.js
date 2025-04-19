import express from 'express'

import {
  requireAuth,
  requireAdmin,
} from '../../middlewares/requireAuth.middleware.js'

import {
  getUser,
  getUsers,
  deleteUser,
  updateUser,
  getRememberedMeUser,
} from './user.controller.js'

const router = express.Router()

router.get('/', requireAdmin, getUsers)
router.get('/rememberMe/:id', requireAuth, getRememberedMeUser)
router.get('/:id', requireAuth, getUser)
router.put('/:id', requireAuth, updateUser)
router.delete('/:id', requireAuth, requireAdmin, deleteUser)

export const userRoutes = router
