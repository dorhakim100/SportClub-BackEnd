import express from 'express'

import { log } from '../../middlewares/logger.middleware.js'
import { requireAdmin } from '../../middlewares/requireAuth.middleware.js'

import { getOpeningTimes, updateOpeningTimes } from './opening.controller.js'

const router = express.Router()

// We can add a middleware for the entire router:
// router.use(requireAuth)

router.get('/', log, getOpeningTimes)
router.put('/', requireAdmin, updateOpeningTimes)

export const openingRoutes = router
