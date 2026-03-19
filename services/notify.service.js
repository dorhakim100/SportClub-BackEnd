import pkg from 'twilio'
const { Twilio } = pkg
import parsePhoneNumber from 'libphonenumber-js'
import { logger } from './logger.service.js'
import { formatSlotDate, formatSlotTimeRange } from './util.service.js'

const client = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

const TEMPLATE_ID = 'HX717db81c00f958fb3d38be18d095343c'
const REGISTRATION_CONFIRMATION_TEMPLATE_ID = 'HX1b7ab8d0a7a994bcc71168c41aa48c59'

export const notifyService = {
  sendWhatsAppNotification,
  sendRegistrationConfirmation
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
    
    const modifiedTo = `whatsapp:${normalizeIsraeliNumber(phone)}`
    const date = formatSlotDate(startTime)
    const timeString = formatSlotTimeRange(startTime, endTime)

    const facilityString = facility === 'gym' ? 'חדר הכושר' : 'בריכה'

  logger.info('Sending registration confirmation to', { name, phone, facility, date, timeString })
   const res =  await client.messages.create({
      to: modifiedTo,
      from: process.env.ADMIN_WHATSAPP_FROM,
      contentSid: REGISTRATION_CONFIRMATION_TEMPLATE_ID,
      contentVariables: JSON.stringify({
        1: `${name}`,
        2: `${facilityString}`,
        3: `${date}`,
        4: `${timeString}`,
      }),
    })
    logger.info('Registration confirmation sent', { res })
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
