import { logger } from '../../services/logger.service.js'
import { messageService } from './message.service.js'

export async function getMessages(req, res) {
  try {
    const filterBy = {
      txt: req.query.txt || '',
      onlyDone: req.query.onlyDone || false,
      sortDir: req.query.sortDir || '',
      pageIdx: req.query.pageIdx,
      isAll: req.query.isAll || false,
    }
    const messages = await messageService.query(filterBy)
    res.json(messages)
  } catch (err) {
    logger.error('Failed to get messages', err)
    res.status(400).send({ err: 'Failed to get messages' })
  }
}
export async function getOpenMessages() {
  try {
    const length = await messageService.queryOpen()
    res.json(length)
  } catch (err) {
    console.log(err)
    throw err
  }
}

export async function getMessageById(req, res) {
  try {
    const messagesId = req.params.id
    const message = await messageService.getById(messagesId)
    res.json(message)
  } catch (err) {
    logger.error('Failed to get message', err)
    res.status(400).send({ err: 'Failed to get message' })
  }
}

export async function addMessage(req, res) {
  const { loggedinUser, body: message } = req

  try {
    message.owner = loggedinUser
    const addedMessage = await messageService.add(message)
    res.json(addedMessage)
  } catch (err) {
    logger.error('Failed to add message', err)
    res.status(400).send({ err: 'Failed to add message' })
  }
}

export async function updateMessage(req, res) {
  const { loggedinUser, body: message } = req
  const { _id: userId, isAdmin } = loggedinUser

  if (!isAdmin && message.owner._id !== userId) {
    res.status(403).send('Not your message...')
    return
  }

  try {
    const updatedMessage = await messageService.update(message)
    res.json(updatedMessage)
  } catch (err) {
    logger.error('Failed to update message', err)
    res.status(400).send({ err: 'Failed to update message' })
  }
}

export async function removeMessage(req, res) {
  try {
    const messagesId = req.params.id
    const removedId = await messageService.remove(messagesId)

    res.send(removedId)
  } catch (err) {
    logger.error('Failed to remove message', err)
    res.status(400).send({ err: 'Failed to remove message' })
  }
}
