import express from 'express'

import { login, signup, logout } from './auth.controller.js'
import { signupLimiter } from '../../middlewares/limiters.middleware.js'

const router = express.Router()

router.post('/login', login)
router.post('/signup', signupLimiter(), signup)
router.post('/logout', logout)

export const authRoutes = router
