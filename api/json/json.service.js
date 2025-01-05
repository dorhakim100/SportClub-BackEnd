// import fs from 'fs'
// import fr from 'follow-redirects'
// import { ObjectId } from 'mongodb'

// import { logger } from '../../services/logger.service.js'
// import { makeId } from '../../services/util.service.js'
// import { dbService } from '../../services/db.service.js'
// import { asyncLocalStorage } from '../../services/als.service.js'

// const simpleGit = require('simple-git')
// const git = simpleGit();

// export const jsonService = {
//   update,
// }

// async function update(){

//     try {
//         // Write data to the JSON file
//         fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

//         // Stage the file
//         await git.add(filePath);

//         // Commit changes
//         await git.commit(commitMessage);

//         // Optional: Push changes (requires proper Git remote setup)
//         await git.push();

//         res.status(200).send('JSON file updated and committed successfully.');
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('An error occurred while committing changes.');
//     }
// }

// function readJsonFile(path) {
//   const str = fs.readFileSync(path, 'utf8')
//   const json = JSON.parse(str)
//   return json
// }

// function writeJsonFile(path, data) {
//   return new Promise((resolve, reject) => {
//     const jsonData = JSON.stringify(data, null, 2)

//     fs.writeFile(path, jsonData, (err) => {
//       if (err) return reject(err)
//       resolve()
//     })
//   })
// }
