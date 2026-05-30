import { Resend } from 'resend'
import {
  formatTimeValue,
  capitalizeFirstLetter,
  formatYMDToDMY,
} from './util.service.js'

export const emailService = {
  sendRegistrationConfirmationEmail,
  sendPaymentConfirmationEmail,
  sendOrderReadyEmail,
  sendAbandonedCartReminderEmail,
}

const resend = new Resend(process.env.RESEND_API_KEY)

const REGISTER_URL = 'https://www.moadonsport.com/register'
const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

async function sendRegistrationConfirmationEmail(
  to,
  name,
  date,
  startHour,
  endHour,
  facility
) {
  facility = facility === 'pool' ? 'בריכה' : 'חדר הכושר'
  name = capitalizeFirstLetter(name)
  startHour = formatTimeValue(startHour)
  endHour = formatTimeValue(endHour)
  date = formatYMDToDMY(date)
  try {
    const { data, error } = await resend.emails.send({
      from: `מועדון הספורט כפר שמריהו <${RESEND_FROM_EMAIL}>`,

      to: [to],
      subject: `רישום מראש - ${facility} - ${date} - ${endHour} - ${startHour}`,
      html: getRegistrationConfirmationEmailHtml(
        name,
        date,
        startHour,
        endHour,
        facility
      ),
    })

    if (error) {
      return console.error({ error })
    }
    console.log({ data })
  } catch (err) {
    console.error('Email error:', err)
  }
}

async function sendPaymentConfirmationEmail(to, payment) {
  if (!to) return

  try {
    const { data, error } = await resend.emails.send({
      from: `מועדון הספורט כפר שמריהו <${RESEND_FROM_EMAIL}>`,
      to: [to],
      subject: `אישור הזמנה #${payment.orderNum}`,
      html: getPaymentConfirmationEmailHtml(payment),
    })

    if (error) {
      return console.error({ error })
    }

    console.log({ data })
  } catch (err) {
    console.error('Payment email error:', err)
  }
}

async function sendOrderReadyEmail(to, payment) {
  if (!to) return

  try {
    const { data, error } = await resend.emails.send({
      from: `מועדון הספורט כפר שמריהו <${RESEND_FROM_EMAIL}>`,
      to: [to],
      subject: `הזמנה #${payment.orderNum} מוכנה לאיסוף`,
      html: getOrderReadyEmailHtml(payment),
    })

    if (error) {
      return console.error({ error })
    }

    console.log({ data })
  } catch (err) {
    console.error('Order ready email error:', err)
  }
}

async function sendAbandonedCartReminderEmail(to, user) {
  if (!to || !user?.items?.length) return

  const safeItems = user?.items?.filter((item) => item && item.quantity > 0)
  if (!safeItems.length) return

  try {
    const { data, error } = await resend.emails.send({
      from: `מועדון הספורט כפר שמריהו <${RESEND_FROM_EMAIL}>`,
      to: [to],
      subject: 'הפריטים שלך עדיין מחכים בעגלה',
      html: getAbandonedCartReminderEmailHtml(user, safeItems),
    })

    if (error) {
      return console.error({ error })
    }

    console.log({ data })
  } catch (err) {
    console.error('Abandoned cart email error:', err)
  }
}

function getRegistrationConfirmationEmailHtml(
  name,
  date,
  startHour,
  endHour,
  facility
) {
  return `
  <div dir="rtl" style="margin:0;padding:0;background-color:#f4f7fb;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:40px auto;padding:20px;">
      
      <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.08);">

        <!-- Header with gradient -->
        <div style="background:linear-gradient(135deg, #6ec1e4, #a8e6a1);padding:24px;text-align:center;">
          <img 
            src="https://ik.imagekit.io/n4mhohkzp/logo.png?updatedAt=1755684259540" 
            alt="logo"
            style="width:80px;height:auto;margin-bottom:10px;"
          />
          <h1 style="margin:0;font-size:22px;color:#ffffff;">
            אישור הזמנה
          </h1>
        </div>

        <!-- Body -->
        <div style="padding:28px 24px;text-align:right;">
          
          <h2 style="margin:0 0 16px;font-size:24px;color:#1f2937;">
            היי ${name}!
          </h2>

          <p style="margin:0 0 20px;font-size:17px;line-height:1.7;color:#374151;">
            אנחנו שומרים לך מקום לאימון
            <span style="font-weight:bold;color:#111827;">ב${facility}</span> 😊
          </p>

          <!-- Info box -->
          <div style="background:#f9fafb;border-radius:12px;padding:18px;border:1px solid #e5e7eb;margin-bottom:24px;">
            <p style="margin:0 0 10px;font-size:15px;color:#374151;">
              <strong>📅 תאריך:</strong> ${date}
            </p>
            <p style="margin:0;font-size:15px;color:#374151;">
              <strong>⏰ שעה:</strong> ${endHour} - ${startHour}
            </p>
          </div>

          <p style="margin:0 0 24px;font-size:17px;color:#374151;">
            מחכים לראות אותך 💪
            <br/>
            אימון נעים!
          </p>

          <!-- CTA Button -->
          <div style="text-align:center;margin-top:30px;">
            <a href="${REGISTER_URL}" 
              style="
                display:inline-block;
                background:#6ec1e4;
                color:#ffffff;
                text-decoration:none;
                padding:12px 22px;
                border-radius:999px;
                font-size:15px;
                font-weight:bold;
              ">
              צפייה בפרטים
            </a>
          </div>

        </div>

        <!-- Footer -->
        <div style="padding:16px;text-align:center;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:13px;color:#9ca3af;">
            הודעה זו נשלחה אוטומטית ממערכת התזכורות
          </p>
        </div>

      </div>
    </div>
  </div>
`
}

function getPaymentConfirmationEmailHtml(payment) {
  const orderDate = new Date(payment.createdAt).toLocaleDateString('he-IL')
  const customerName = capitalizeFirstLetter(
    payment?.user?.fullname || 'לקוח/ה'
  )
  const itemsRows = (payment.items || [])
    .map((item) => {
      const itemTitle = item?.title?.he || item?.title?.eng || 'מוצר'
      const quantity = item?.quantity || 1
      const itemPrice = item?.price || 0
      const lineTotal = itemPrice * quantity

      return `
      <tr>
        <td style="padding:10px 8px;font-size:14px;color:#111827;border-bottom:1px solid #e5e7eb;">${itemTitle}</td>
        <td style="padding:10px 8px;font-size:14px;color:#374151;border-bottom:1px solid #e5e7eb;text-align:center;">${quantity}</td>
        <td style="padding:10px 8px;font-size:14px;color:#374151;border-bottom:1px solid #e5e7eb;text-align:left;">${lineTotal}₪</td>
      </tr>
      `
    })
    .join('')

  return `
  <div dir="rtl" style="margin:0;padding:0;background-color:#f4f7fb;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:40px auto;padding:20px;">
      <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg, #6ec1e4, #a8e6a1);padding:24px;text-align:center;">
          <img
            src="https://ik.imagekit.io/n4mhohkzp/logo.png?updatedAt=1755684259540"
            alt="logo"
            style="width:80px;height:auto;margin-bottom:10px;"
          />
          <h1 style="margin:0;font-size:22px;color:#ffffff;">אישור תשלום</h1>
        </div>

        <div style="padding:28px 24px;text-align:right;">
          <h2 style="margin:0 0 16px;font-size:24px;color:#1f2937;">תודה ${customerName}!</h2>

          <p style="margin:0 0 20px;font-size:17px;line-height:1.7;color:#374151;">
          ההזמנה שלך נקלטה במערכת בהצלחה 🎉
          </p>
          <p style="margin:0 0 20px;font-size:17px;line-height:1.7;color:#374151;">
          אחד מאיתנו כבר מתחיל לעבוד עליה!
          </p>

          <div style="background:#f9fafb;border-radius:12px;padding:18px;border:1px solid #e5e7eb;margin-bottom:20px;">
            <p style="margin:0 0 10px;font-size:15px;color:#374151;">
              <strong>מספר הזמנה:</strong> ${payment.orderNum}
            </p>
            <p style="margin:0 0 10px;font-size:15px;color:#374151;">
              <strong>תאריך:</strong> ${orderDate}
            </p>
            <p style="margin:0;font-size:15px;color:#374151;">
              <strong>סה"כ לתשלום:</strong> ${payment.amount}₪
            </p>
          </div>

          <table style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:10px 8px;font-size:13px;color:#6b7280;text-align:right;">מוצר</th>
                <th style="padding:10px 8px;font-size:13px;color:#6b7280;text-align:center;">כמות</th>
                <th style="padding:10px 8px;font-size:13px;color:#6b7280;text-align:left;">סה"כ</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <p style="margin:20px 0 0;font-size:16px;color:#374151; text-align:center;">
            אנחנו זמינים לכל שאלה בטלפון
          </p>
          <p style="margin:20px 0 0;font-size:16px;color:#374151; text-align:center;">
            09-958-0404
          </p>
        </div>

        <div style="padding:16px;text-align:center;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:13px;color:#9ca3af;">
            הודעה זו נשלחה אוטומטית ממערכת ההזמנות
          </p>
        </div>
      </div>
    </div>
  </div>
`
}

function getOrderReadyEmailHtml(payment) {
  const customerName = capitalizeFirstLetter(
    payment?.user?.fullname || 'לקוח/ה'
  )

  return `
  <div dir="rtl" style="margin:0;padding:0;background-color:#f4f7fb;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:40px auto;padding:20px;">
      <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg, #6ec1e4, #a8e6a1);padding:24px;text-align:center;">
          <img
            src="https://ik.imagekit.io/n4mhohkzp/logo.png?updatedAt=1755684259540"
            alt="logo"
            style="width:80px;height:auto;margin-bottom:10px;"
          />
          <h1 style="margin:0;font-size:22px;color:#ffffff;">ההזמנה מוכנה</h1>
        </div>

        <div style="padding:28px 24px;text-align:right;">
          <h2 style="margin:0 0 16px;font-size:24px;color:#1f2937;">היי ${customerName}!</h2>

          <p style="margin:0 0 20px;font-size:17px;line-height:1.7;color:#374151;">
            הזמנה מספר <strong style="color:#111827;">${payment.orderNum}</strong> מוכנה ומחכה לך לאיסוף 🎉
          </p>

          <div style="background:#f9fafb;border-radius:12px;padding:18px;border:1px solid #e5e7eb;margin-bottom:20px;">
            <p style="margin:0 0 10px;font-size:15px;color:#374151;">
              <strong>מספר הזמנה:</strong> ${payment.orderNum}
            </p>
            <p style="margin:0;font-size:15px;color:#374151;">
              <strong>סטטוס:</strong> מוכנה לאיסוף
            </p>
          </div>

          <p style="margin:20px 0 0;font-size:16px;color:#374151; text-align:center;">
            אנחנו זמינים לכל שאלה בטלפון
          </p>
          <p style="margin:20px 0 0;font-size:16px;color:#374151; text-align:center;">
            09-958-0404
          </p>
        </div>

        <div style="padding:16px;text-align:center;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:13px;color:#9ca3af;">
            הודעה זו נשלחה אוטומטית ממערכת ההזמנות
          </p>
        </div>
      </div>
    </div>
  </div>
`
}

function getAbandonedCartReminderEmailHtml(user, items) {
  const customerName = capitalizeFirstLetter(user?.fullname || 'לקוח/ה')
  const itemsCount = items.reduce((acc, item) => acc + (item?.quantity || 1), 0)
  const totalPrice = items.reduce(
    (acc, item) => acc + Number(item?.price || 0) * Number(item?.quantity || 1),
    0
  )
  const earlySeasonDiscountBadge =
    Date.now() < new Date().getMonth() < 6
      ? '<span style="display:inline-block;background:#fee2e2;color:#b91c1c;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:700; margin-bottom:10px; text-align:center;">לפני שהטבת המכירה המוקדמת מסתיימת!</span>'
      : ''
  let hasDiscount = false

  const itemsRows = items
    .map((item) => {
      const quantity = Number(item?.quantity || 1)
      const itemPrice = Number(item?.price || 0)
      const lineTotal = itemPrice * quantity
      const cover =
        item?.cover ||
        item?.imgs?.[0] ||
        'https://ik.imagekit.io/n4mhohkzp/logo.png?updatedAt=1755684259540'
      const itemTitle = escapeHtml(
        item?.title?.he || item?.title?.eng || item?.title || 'מוצר'
      )
      const discountBadge = item?.isDiscount
        ? '<span style="display:inline-block;background:#fee2e2;color:#b91c1c;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:700;">הנחה</span>'
        : ''

      if (item?.isDiscount) hasDiscount = true

      return `
      <tr>
        <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;">
          <div style="display:flex;align-items:center;gap:10px;justify-content:flex-start;">
            <img src="${cover}" alt="${itemTitle}" style="width:56px;height:56px;object-fit:cover;border-radius:10px;border:1px solid #e5e7eb;" />
            <div  style="margin-right:10px;">
              <p style="margin:0 0 6px;font-size:14px;color:#111827;font-weight:600;">${itemTitle}</p>
              ${discountBadge}
          
            </div>
          </div>
        </td>
        <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:14px;color:#374151;">${quantity}</td>
        <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:left;font-size:14px;color:#111827;font-weight:700;">${lineTotal}₪</td>
      </tr>
      `
    })
    .join('')

  return `
  <div dir="rtl" style="margin:0;padding:0;background-color:#f4f7fb;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:40px auto;padding:20px;">
      <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg, #6ec1e4, #a8e6a1);padding:24px;text-align:center;">
          <img
            src="https://ik.imagekit.io/n4mhohkzp/logo.png?updatedAt=1755684259540"
            alt="logo"
            style="width:80px;height:auto;margin-bottom:10px;"
          />
          <h1 style="margin:0;font-size:22px;color:#ffffff;">העגלה שלך מחכה לך</h1>
        </div>

        <div style="padding:28px 24px;text-align:right;">
          <h2 style="margin:0 0 16px;font-size:24px;color:#1f2937;">היי ${customerName}!</h2>

          <p style="margin:0 0 20px;font-size:17px;line-height:1.7;color:#374151;">
          ${
            items.count > 1
              ? ` שמרנו עבורך ${itemsCount} פריטים בעגלה.
`
              : `שמרנו עבורך את הפריט שבעגלה.`
          }
            <br/>
            רוצה להשלים את ההזמנה עכשיו?
          </p>

    ${hasDiscount ? earlySeasonDiscountBadge : ''}

          <table style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:10px 8px;font-size:13px;color:#6b7280;text-align:right;">פריט</th>
                <th style="padding:10px 8px;font-size:13px;color:#6b7280;text-align:center;">כמות</th>
                <th style="padding:10px 8px;font-size:13px;color:#6b7280;text-align:left;">סה"כ</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div style="background:#f9fafb;border-radius:12px;padding:16px;border:1px solid #e5e7eb;margin-top:18px;">
            <p style="margin:0;font-size:16px;color:#111827;">
              <strong>סה"כ בעגלה:</strong> ${totalPrice}₪
            </p>
          </div>

          <div style="text-align:center;margin-top:24px;">
            <a href="${getCartUrl(user)}"
              style="
                display:inline-block;
                background:#6ec1e4;
                color:#ffffff;
                text-decoration:none;
                padding:12px 22px;
                border-radius:999px;
                font-size:15px;
                font-weight:bold;
              ">
              חזרה לעגלה
            </a>
          </div>
        </div>

        <div style="padding:16px;text-align:center;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:13px;color:#9ca3af;">
            הודעה זו נשלחה אוטומטית ממערכת ההזמנות
          </p>
        </div>
      </div>
    </div>
  </div>
`
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getCartUrl(user) {
  if (!user || !user._id) return 'https://www.moadonsport.com/'

  return `https://www.moadonsport.com/user/${user._id}/cart`
}
