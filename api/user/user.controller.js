import { userService } from './user.service.js'
import { logger } from '../../services/logger.service.js'
import { socketService } from '../../services/socket.service.js'

export async function getUser(req, res) {
  try {
    const requiredId = req.params.id
    const { loggedinUser } = req

    if (!loggedinUser.isAdmin && requiredId !== loggedinUser._id) {
      return res.status(404).send({ err: 'Failed to get user' })
    }

    const user = await userService.getById(req.params.id)
    if (!user) {
      return res.status(404).send({ err: 'User not found' })
    }
    res.send(user)
  } catch (err) {
    logger.error('Failed to get user', err)
    res.status(400).send({ err: 'Failed to get user' })
  }
}

export async function getUsers(req, res) {
  try {
    const filterBy = {
      txt: req.query?.txt || '',
      onlyMembers: req.query?.onlyMembers === 'true' ? true : false,
      calledUserId: req.query?.calledUserId || '',
      pageIdx: req.query?.pageIdx || 0,
      isAll: req.query?.isAll === 'true' ? true : false,
      isMax: req.query?.isMax === 'true' ? true : false,
    }
    const users = await userService.query(filterBy)
    if (filterBy.isMax) {
      return res.json(users)
    }

    res.send(users)
  } catch (err) {
    logger.error('Failed to get users', err)
    res.status(400).send({ err: 'Failed to get users' })
  }
}

export async function deleteUser(req, res) {
  try {
    await userService.remove(req.params.id)
    res.send({ msg: 'Deleted successfully' })
  } catch (err) {
    logger.error('Failed to delete user', err)
    res.status(400).send({ err: 'Failed to delete user' })
  }
}

export async function updateUser(req, res) {
  try {
    const requiredId = req.params.id
    const { loggedinUser } = req

    if (!loggedinUser.isAdmin && requiredId !== loggedinUser._id) {
      return res.status(404).send({ err: 'Failed to update user' })
    }

    const user = req.body
    const savedUser = await userService.update(user)
    res.send(savedUser)
  } catch (err) {
    logger.error('Failed to update user', err)
    res.status(400).send({ err: 'Failed to update user' })
  }
}
