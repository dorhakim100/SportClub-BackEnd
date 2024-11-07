import express from 'express'

import { requireAuth } from '../../middlewares/requireAuth.middleware.js'
import { requireAdmin } from '../../middlewares/requireAuth.middleware.js'
import { log } from '../../middlewares/logger.middleware.js'

import {
  getClasses,
  getClassById,
  addClass,
  updateClass,
  removeClass,
  getClassTrainers,
  getOccurrences,
} from './clas.controller.js'

const router = express.Router()

// We can add a middleware for the entire router:
// router.use(requireAuth)

router.get('/', log, getClasses)
router.get('/schedule', log, getOccurrences)
router.get('/:id', log, getClassById)
router.get('/:id/trainers', log, getClassTrainers)
router.post('/', log, requireAdmin, addClass)
router.put('/:id', requireAdmin, updateClass)
router.delete('/:id', requireAdmin, removeClass)
// router.delete('/:id', requireAuth, requireAdmin, removeClass)

export const classRoutes = router
