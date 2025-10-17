// import { dbService } from './db.service.js'
// import { ObjectId } from 'mongodb'
// import { logger } from './logger.service.js'

// export async function handleSpamUsers() {
//   try {
//     const collection = await dbService.getCollection('user')
//     const fromId = new ObjectId('68f24727fe43bf3f74c710ed')
//     const toId = new ObjectId('68f2473f27173333200b731c')

//     const users = await collection
//       .find({
//         _id: { $gte: fromId, $lte: toId },
//         // verified: false,
//       })
//       .toArray()
//     console.log(users.length)

//     collection.deleteMany({
//       _id: { $gte: fromId, $lte: toId },
//     })
//   } catch (err) {
//     logger.error('Failed to handle spam users', err)
//   }
// }
