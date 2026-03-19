import pkg from 'twilio'

const { Twilio } = pkg
import parsePhoneNumber from 'libphonenumber-js'
import { logger } from './logger.service.js'
import { formatSlotDate, formatSlotTimeRange, formatTimeValue } from './util.service.js'

const client = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

const TEMPLATE_ID = 'HX717db81c00f958fb3d38be18d095343c'
const REGISTRATION_CONFIRMATION_TEMPLATE_ID = 'HX1b7ab8d0a7a994bcc71168c41aa48c59'
const ERROR_SLOT_CREATION_TEMPLATE_ID = 'HX3fb42a449972163cfc557fee3a927250'

const DEVELOPER_PHONE = '0542044022'

export const notifyService = {
  sendWhatsAppNotification,
  sendRegistrationConfirmation,
  sendErrorSlotCreation
}



// HXfbd89124d5dc830a96bb857acccb4dcb
async function sendWhatsAppNotification(order, from, to) {
  try {
    const modifiedTo = `whatsapp:${normalizeIsraeliNumber(to)}`
    // const modifiedTo = `whatsapp:${'+972508833262'}`
    const { name, orderNumber } = order

    await client.messages.create({
      to: modifiedTo,
      from,
      contentSid: TEMPLATE_ID,
      contentVariables: JSON.stringify({
        name: `${name}`,
        num: `${orderNumber}`,
      }),
    })
  } catch (err) {
    console.error('Twilio error:', err)
  }
}
async function sendRegistrationConfirmation(slot, profile) {
  try {
    // const modifiedTo = `whatsapp:${'+972508833262'}`
    
    const { facility, startTime, endTime } = slot
    const { name, phone } = profile

    const startHourPus2Hours = new Date(startTime.getTime() + 2 * 60 * 60 * 1000)
    const endHourPlus2Hours = new Date(endTime.getTime() + 2 * 60 * 60 * 1000)
    
    // const modifiedTo = `whatsapp:${normalizeIsraeliNumber(phone)}`
    const modifiedTo = normalizeIsraeliNumber(phone)
    const date = formatSlotDate(startHourPus2Hours)
    const timeString = formatSlotTimeRange(startHourPus2Hours, endHourPlus2Hours)

    const facilityString = facility === 'gym' ? 'חדר הכושר' : 'בריכה'

  logger.info('Sending registration confirmation to', { name, phone, facility, date, timeString })
  //  const res =  await client.messages.create({
  //     to: modifiedTo,
  //     from: process.env.ADMIN_WHATSAPP_FROM,
  //     contentSid: REGISTRATION_CONFIRMATION_TEMPLATE_ID,
  //     contentVariables: JSON.stringify({
  //       1: `${name}`,
  //       2: `${facilityString}`,
  //       3: `${date}`,
  //       4: `${timeString}`,
  //     }),
  //   })

  const res= await client.messages.create({

    to: `${modifiedTo}`,
    
    from: '+972535602776',
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    body:`
היי ${name}!
אנחנו שומרים לך מקום לאימון ב${facilityString} :)
ביום ${date},
בשעה: ${timeString}
אימון נעים!
`})
  logger.info('Registration confirmation sent', { res })
  } catch (err) {
    console.error('Twilio error:', err)
  }
}


async function sendErrorSlotCreation(date, startTime, endTime, facility) {
  try {
    // const modifiedTo = `whatsapp:${'+972508833262'}`
    
    const modifiedTo = normalizeIsraeliNumber(DEVELOPER_PHONE)
    if (!modifiedTo) {
      logger.error('Invalid developer phone number for slot error notification')
      return
    }

  logger.info('Sending error slot creation to', { date, startTime, endTime, facility })
  //  const res =  await client.messages.create({
  //     to: modifiedTo,
  //     from: process.env.ADMIN_WHATSAPP_FROM,
  //     contentSid: ERROR_SLOT_CREATION_TEMPLATE_ID,
  //     contentVariables: JSON.stringify({
  //       1: `${formatSlotDate(date, true)}`,
  //       2: `${formatTimeValue(startTime)}`,
  //       3: `${formatTimeValue(endTime)}`,
  //       4: `${facility}`,
  //     }),
  //   })
   await client.messages.create({

    to: `${modifiedTo}`,
    
    from: '+972535602776',
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    body:`
There was an error creating a slot.
Date: ${date}.
Time: ${startTime} - ${endTime}.
Facility: ${facility}.
`

    })
  } catch (err) {
    console.error('Twilio error:', err)
  }
}

function normalizeIsraeliNumber(input) {
  // try to parse; default country "IL" for numbers without country code
  const phone = parsePhoneNumber(input, 'IL')
  if (!phone || !phone.isValid()) return null

  return phone.number // E.164 format
}


