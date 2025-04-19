import { logger } from '../../services/logger.service.js'
import { itemService } from './item.service.js'

export async function getItems(req, res) {
  try {
    const filterBy = {
      txt: req.query.txt || '',
      maxPrice: +req.query.maxPrice || '',
      sortDir: req.query.sortDir || '',
      types: req.query.types || [],
      pageIdx: +req.query.pageIdx,
      isAll: req.query.isAll === 'true' ? true : false,
      isMax: req.query.isMax === 'true' ? true : false,
    }

    const items = await itemService.query(filterBy)

    if (filterBy.isMax) {
      return res.json(items)
    }

    res.json(items)
  } catch (err) {
    logger.error('Failed to get items', err)
    res.status(400).send({ err: 'Failed to get items' })
  }
}

export async function getCartItems(req, res) {
  try {
    const cart = Object.values(req.query)
    const cartToReturn = await itemService.queryCart(cart)

    // let items = await itemService.query({ isAll: true })

    // const itemsToReturn = []

    // cart.map((item, index) => {
    //   const itemId = ObjectId.createFromHexString(item.id)

    //   const currItem = items.find((itemToFind) => itemToFind._id === itemId)
    //   if (currItem) {
    //     itemsToReturn[index] = {
    //       id: currItem._id,
    //       cover: currItem.cover,
    //       price: currItem.price,
    //       title: currItem.title,
    //       quantity: item.quantity,
    //     }
    //     // index++
    //   }
    // })
    // console.log(itemsToReturn)

    res.json(cartToReturn)
  } catch (err) {
    console.log(err)
  }
}

export async function getItemById(req, res) {
  try {
    const itemId = req.params.id
    const filterBy = {
      pageIdx: req.query.pageIdx,
      isSkipPage: true,
      types: req.query.types,
      sortDir: req.query.sortDir,
    }
    const item = await itemService.getById(itemId, filterBy)
    res.json(item)
  } catch (err) {
    logger.error('Failed to get item', err)
    res.status(400).send({ err: 'Failed to get item' })
  }
}

export async function addItem(req, res) {
  const { loggedinUser, body: item } = req

  try {
    item.owner = loggedinUser
    const addedItem = await itemService.add(item)
    res.json(addedItem)
  } catch (err) {
    logger.error('Failed to add item', err)
    res.status(400).send({ err: 'Failed to add item' })
  }
}

export async function updateItem(req, res) {
  const { loggedinUser, body: item } = req
  // const { _id: userId, isAdmin } = loggedinUser

  // if (!isAdmin && item.owner._id !== userId) {
  //   res.status(403).send('Not your item...')
  //   return
  // }

  try {
    const updatedItem = await itemService.update(item)
    res.json(updatedItem)
  } catch (err) {
    logger.error('Failed to update item', err)
    res.status(400).send({ err: 'Failed to update item' })
  }
}

export async function removeItem(req, res) {
  try {
    const itemId = req.params.id
    const removedId = await itemService.remove(itemId)

    res.send(removedId)
  } catch (err) {
    logger.error('Failed to remove item', err)
    res.status(400).send({ err: 'Failed to remove item' })
  }
}
