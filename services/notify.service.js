import pkg from 'twilio'
const { Twilio } = pkg
import parsePhoneNumber from 'libphonenumber-js'

const client = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export const notifyService = {
  sendWhatsAppNotification,
}

async function sendWhatsAppNotification(body, from, to) {
  try {
    const modifiedTo = `whatsapp:${normalizeIsraeliNumber(to)}`
    console.log(from)
    console.log(modifiedTo)
    await client.messages.create({
      from,
      to: modifiedTo,
      body,
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
