import pkg from 'twilio'
const { Twilio } = pkg
import parsePhoneNumber from 'libphonenumber-js'

const client = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

const TEMPLATE_ID = 'HX717db81c00f958fb3d38be18d095343c'

export const notifyService = {
  sendWhatsAppNotification,
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

function normalizeIsraeliNumber(input) {
  // try to parse; default country "IL" for numbers without country code
  const phone = parsePhoneNumber(input, 'IL')
  if (!phone || !phone.isValid()) return null

  return phone.number // E.164 format
}
