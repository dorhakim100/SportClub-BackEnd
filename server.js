import http from 'http'
import path from 'path'
import cors from 'cors'
import express from 'express'
import cookieParser from 'cookie-parser'

import { authRoutes } from './api/auth/auth.routes.js'
import { userRoutes } from './api/user/user.routes.js'
import { itemRoutes } from './api/item/item.routes.js'
import { classRoutes } from './api/class/class.routes.js'
import { couponRoutes } from './api/coupon/coupon.routes.js'
import { messageRoutes } from './api/message/message.routes.js'
import { trainerRoutes } from './api/trainer/trainer.routes.js'
import { updateRoutes } from './api/update/update.routes.js'
import { paymentRoutes } from './api/payment/payment.routes.js'
// import { jsonRoutes } from './api/json/json.routes.js'
import { setupSocketAPI } from './services/socket.service.js'

import { setupAsyncLocalStorage } from './middlewares/setupAls.middleware.js'

const app = express()
const server = http.createServer(app)

// Express App Config
app.use(cookieParser())
app.use(express.json())

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve('public')))
} else {
  const corsOptions = {
    origin: [
      'http://127.0.0.1:3000',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://localhost:5173',
    ],
    credentials: true,
  }
  app.use(cors(corsOptions))
}
app.all('*', setupAsyncLocalStorage)

app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/item', itemRoutes)
app.use('/api/class', classRoutes)
app.use('/api/coupon', couponRoutes)
app.use('/api/message', messageRoutes)
app.use('/api/trainer', trainerRoutes)
app.use('/api/update', updateRoutes)
app.use('/api/payment', paymentRoutes)
// app.use('/api/json', jsonRoutes)

setupSocketAPI(server)

// Make every unhandled server-side-route match index.html
// so when requesting http://localhost:3030/unhandled-route...
// it will still serve the index.html file
// and allow vue/react-router to take it from there

app.get('/**', (req, res) => {
  res.sendFile(path.resolve('public/index.html'))
})

import { logger } from './services/logger.service.js'
const port = process.env.PORT || 3030

server.listen(port, () => {
  logger.info('Server is running on port: ' + port)
})
