// import { logger } from '../../services/logger.service.js'
// import { jsonService } from './json.service.js'

// export async function updateItem(req, res) {
//   const { loggedinUser, body: json } = req
//   const { _id: userId, isAdmin } = loggedinUser

//   if (!isAdmin) {
//     res.status(403).send('Not your json...')
//   }

//   try {
//     const updatedJson = await jsonService.update(json)
//     res.json(updatedJson)
//   } catch (err) {
//     logger.error('Failed to update json', err)
//     res.status(400).send({ err: 'Failed to update json' })
//   }
// }
