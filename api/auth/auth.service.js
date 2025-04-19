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

const SERVICE = 'service.kfar@gmail.com'
const MANAGER = 'sportclub.kfar@gmail.com'

async function login(
  emailOrUsername,
  password,
  isRemembered,
  loginToken,
  isGoogle,
  fullname,
  imgUrl = ''
) {
  try {
    if (isGoogle) {
      const googleUser = await userService.getByUsername(emailOrUsername)
      if (googleUser) {
        delete googleUser.password
        googleUser._id = googleUser._id.toString()
        googleUser.imgUrl = imgUrl
        await userService.update({ ...googleUser, imgUrl: imgUrl })
        return googleUser
      } else {
        const isAdmin = emailOrUsername === (SERVICE || MANAGER) ? true : false
        return userService.add({
          username: emailOrUsername,
          fullname: fullname,
          isAdmin: isAdmin,
          ordersIds: [],
          items: [],
          email: emailOrUsername,
          imgUrl,
        })
      }
    }
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

    if (!isRemembered) {
      const match = await bcrypt.compare(password, user.password)
      if (!match) return new Error('Invalid password')
    }

    delete user.password
    user._id = user._id.toString()
    user.imgUrl = imgUrl
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
  phone,
}) {
  const saltRounds = 10

  logger.debug(
    `auth.service - signup with username: ${username}, fullname: ${fullname}`
  )
  if (!username || !password || !fullname || !email || !phone)
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
      phone,
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
