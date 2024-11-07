import express from 'express'

import { requireAuth } from '../../middlewares/requireAuth.middleware.js'
import { requireAdmin } from '../../middlewares/requireAuth.middleware.js'
import { log } from '../../middlewares/logger.middleware.js'

import {
  getTrainers,
  getTrainerById,
  addTrainer,
  updateTrainer,
  removeTrainer,
} from './trainer.controller.js'

const router = express.Router()

// We can add a middleware for the entire router:
// router.use(requireAuth)

router.get('/', log, getTrainers)
router.get('/:id', log, getTrainerById)
router.post('/', log, requireAdmin, addTrainer)
router.put('/:id', requireAdmin, updateTrainer)
router.delete('/:id', requireAdmin, removeTrainer)
// router.delete('/:id', requireAuth, requireAdmin, removeTrainer)

export const trainerRoutes = router
