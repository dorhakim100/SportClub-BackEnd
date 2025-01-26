import { Router } from 'express'

const router = Router()

// Redirect old Hebrew paths to new English paths
router.get('/חוגים/מערכת-חוגים/', (req, res) => {
  res.redirect(301, '/class/schedule')
})

router.get('/אודות/שעות-פעילות/', (req, res) => {
  res.redirect(301, '/about/times')
})

router.get('/בריכה/', (req, res) => {
  res.redirect(301, '/facilities')
})
router.get('/אודות/מתקנים/', (req, res) => {
  res.redirect(301, '/facilities')
})

export const redirectRoutes = router
