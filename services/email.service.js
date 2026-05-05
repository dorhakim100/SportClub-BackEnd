import { Resend } from 'resend';
import { formatTimeValue, capitalizeFirstLetter, formatYMDToDMY } from './util.service.js';

export const emailService = {
  sendRegistrationConfirmationEmail,
  sendPaymentConfirmationEmail,
}


const resend = new Resend(process.env.RESEND_API_KEY);

const REGISTER_URL = 'https://www.moadonsport.com/register'
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

async function sendRegistrationConfirmationEmail(to, name, date, startHour, endHour, facility) {
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
    html: getRegistrationConfirmationEmailHtml(name, date, startHour, endHour, facility),
  });
  
  if (error) {
      return console.error({ error });
    }
    console.log({ data });
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

function getRegistrationConfirmationEmailHtml(name, date, startHour, endHour, facility) {



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
  const customerName = capitalizeFirstLetter(payment?.user?.fullname || 'לקוח/ה')
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
          ההזמנה שלך נקלטה במערכת בהצלחה, אחד מאיתנו כבר מתחיל לעבוד עליה!
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