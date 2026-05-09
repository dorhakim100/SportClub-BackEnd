import cron from 'node-cron'

import { dbService } from './db.service.js'
import { emailService } from './email.service.js'
import { logger } from './logger.service.js'

const TIMEZONE = 'Asia/Jerusalem'
const ABANDONED_HOURS = 48

export function setupAbandonedCartScheduler() {
  // Run at minute 0 of every hour
  cron.schedule(
    '0 * * * *',
    async () => {
      logger.info('Running abandoned-cart scheduler')
      try {
        await runAbandonedCartSchedulerCycle()
        logger.info('Finished abandoned-cart scheduler cycle')
      } catch (err) {
        logger.error('Failed abandoned-cart scheduler cycle', { err })
      }
    },
    {
      timezone: TIMEZONE,
    }
  )
}

async function runAbandonedCartSchedulerCycle() {
  try {
    
    const collection = await dbService.getCollection('user')
    const users = await collection
      .find({
        email: { $exists: true, $ne: '' },
        items: { $exists: true, $ne: [] },
      })
      .toArray()
  
    const cutoffTimestamp = Date.now() - ABANDONED_HOURS * 60 * 60 * 1000 // 48 hours ago
    const usersWithEligibleItems = users
      .map((user) => ({
        user,
        eligibleItems: getEligibleItemsToEmail(user.items, cutoffTimestamp),
      }))
      .filter(({ eligibleItems }) => eligibleItems.length > 0)
  
    logger.info('Abandoned-cart scheduler stats', {
      scannedUsers: users.length,
      eligibleUsers: usersWithEligibleItems.length,
    })
  
    let sentEmails = 0
  
    for (const { user, eligibleItems } of usersWithEligibleItems) {
      try {
        await emailService.sendAbandonedCartReminderEmail(
          user.email,
          user,
          eligibleItems
        )
  
        await markItemsAsEmailSent(collection, user, cutoffTimestamp)
        sentEmails++
      } catch (err) {
        logger.error('Failed sending abandoned-cart email for user', {
          userId: user?._id?.toString?.() || user?._id,
          err,
        })
      }
    }
  
    logger.info('Abandoned-cart scheduler finished', {
      scannedUsers: users.length,
      eligibleUsers: usersWithEligibleItems.length,
      sentEmails,
    })
  } catch (err) {

    logger.error('Failed running abandoned-cart scheduler cycle', { err })
    
  }
}

function getEligibleItemsToEmail(items = [], cutoffTimestamp) {
  return items.filter((item) => {
    if (!item || item?.emailSent) return false

    const addedAtTimestamp = normalizeToTimestamp(item.addedAt)
    if (!addedAtTimestamp) return false

    return addedAtTimestamp <= cutoffTimestamp
  })
}

async function markItemsAsEmailSent(collection, user, cutoffTimestamp) {
  const originalItems = Array.isArray(user?.items) ? user.items : []
  if (!originalItems.length) return

  let hasChanges = false
  const nextItems = originalItems.map((item) => {
    if (!item || item.emailSent === true) return item

    const addedAtTimestamp = normalizeToTimestamp(item.addedAt)
    if (!addedAtTimestamp || addedAtTimestamp > cutoffTimestamp) return item

    hasChanges = true
    return { ...item, emailSent: true }
  })

  if (!hasChanges) return

  await collection.updateOne({ _id: user._id }, { $set: { items: nextItems } })
}

function normalizeToTimestamp(value) {
  if (typeof value === 'number') return Number.isNaN(value) ? null : value

  if (typeof value === 'string') {
    const asNumber = Number(value)
    if (!Number.isNaN(asNumber) && asNumber > 0) return asNumber

    const asDate = Date.parse(value)
    if (!Number.isNaN(asDate)) return asDate
  }

  if (value instanceof Date) {
    const ts = value.getTime()
    return Number.isNaN(ts) ? null : ts
  }

  return null
}
