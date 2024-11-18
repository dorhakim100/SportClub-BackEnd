import Cryptr from 'cryptr'
import bcrypt from 'bcrypt'

import { userService } from '../user/user.service.js'
import { logger } from '../../services/logger.service.js'

const cryptr = new Cryptr(process.env.SECRET || 'Secret-Puk-1234')

export const authService = {
  signup,
  login,
  getLoginToken,
  validateToken,
}

async function login(emailOrUsername, password, isRemembered, loginToken) {
  try {
    logger.debug(
      `auth.service - login with emailOrUsername: ${emailOrUsername}`
    )

    if (isRemembered && loginToken) {
      const loggedinUser = validateToken(loginToken)
      if (!loggedinUser) new Error('Invalid token')
      return loggedinUser
    }

    let user = await userService.getByUsername(emailOrUsername)

    if (!user) return new Error('Invalid email or username')

    // TODO: un-comment for real login
    // console.log('cookies', req.cookies.loginToken)

    if (!isRemembered) {
      const match = await bcrypt.compare(password, user.password)
      if (!match) return new Error('Invalid password')
    }

    delete user.password
    user._id = user._id.toString()
    return user
  } catch (err) {
    console.log(err)
    throw err
  }
}

async function signup({
  username,
  password,
  fullname,
  isAdmin,
  ordersIds = [],
  items = [],
  email,
}) {
  const saltRounds = 10

  logger.debug(
    `auth.service - signup with username: ${username}, fullname: ${fullname}`
  )
  if (!username || !password || !fullname || !email)
    return Promise.reject('Missing required signup information')

  const userExist = await userService.getByUsername(username, email)
  if (userExist) return Promise.reject('Username or email already taken')

  try {
    const hash = await bcrypt.hash(password, saltRounds)
    return userService.add({
      username,
      password: hash,
      fullname,
      isAdmin: isAdmin || false,
      ordersIds,
      items,
      email,
    })
  } catch (err) {
    console.log(err)
    throw err
  }
}

function getLoginToken(user) {
  const userInfo = {
    _id: user._id,
    fullname: user.fullname,
    isAdmin: user.isAdmin || false,
    ordersIds: user.ordersIds,
    items: user.items,
    email: user.email,
  }
  return cryptr.encrypt(JSON.stringify(userInfo))
}

function validateToken(loginToken) {
  try {
    const json = cryptr.decrypt(loginToken)
    const loggedinUser = JSON.parse(json)
    return loggedinUser
  } catch (err) {
    console.log('Invalid login token')
  }
  return null
}
