// import configProd from './prod.js'
// import configDev from './dev.js'

import dotenv from 'dotenv'
dotenv.config()

export var config

if (process.env.NODE_ENV === 'production') {
  config = {
    dbURL:
      process.env.MONGO_URL ||
      'mongodb+srv://theUser:thePass@cluster0-klgzh.mongodb.net/test?retryWrites=true&w=majority',
    dbName: process.env.DB_NAME || 'blabla',
  }
} else {
  config = {
    dbURL:
      process.env.MONGO_URL ||
      'mongodb+srv://theUser:thePass@cluster0-klgzh.mongodb.net/test?retryWrites=true&w=majority',
    dbName: process.env.DB_NAME || 'blabla',
  }
}
// config.isGuestMode = true
