import { sendEmail } from '@/lib/email'

const BASE_URL = process.env.NEXTAUTH_URL || 'https://blocx.ro'

// ─── EMAIL ───────────────────────────────────────

export function buildReferralEmailHtml(referrerName: string, referralLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2563eb, #4f46e5); color: white; padding: 32px; border-radius: 16px 16px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 32px; border-radius: 0 0 16px 16px; }
    .highlight { background: #eff6ff; border: 2px dashed #2563eb; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
    .btn { display: inline-block; background: #2563eb; color: white; padding: 16px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 16px 0; }
    .benefits { list-style: none; padding: 0; margin: 20px 0; }
    .benefits li { padding: 8px 0; padding-left: 28px; position: relative; }
    .benefits li::before { content: "✅"; position: absolute; left: 0; }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">🏢 Ești invitat pe BlocX!</h1>
      <p style="margin: 12px 0 0 0; opacity: 0.9; font-size: 16px;">Administrare inteligentă de bloc</p>
    </div>
    <div class="content">
      <p style="font-size: 16px;">Salut!</p>
      <p><strong>${referrerName}</strong> te invită să încerci <strong>BlocX</strong> — platforma care automatizează 95% din administrarea blocului.</p>

      <ul class="benefits">
        <li>Chitanțe generate automat în 30 de secunde</li>
        <li>Portal online pentru proprietari</li>
        <li>Plăți online cu cardul</li>
        <li>Setup complet în 15 minute</li>
        <li><strong>Gratuit</strong> pentru max 20 apartamente</li>
      </ul>

      <div class="highlight">
        <p style="margin: 0 0 12px 0; font-weight: 600; color: #1e40af;">Începe acum — este gratuit!</p>
        <a href="${referralLink}" class="btn">Creează cont gratuit →</a>
      </div>

      <p style="font-size: 14px; color: #6b7280;">
        Sau copiază link-ul: <a href="${referralLink}" style="color: #2563eb;">${referralLink}</a>
      </p>
    </div>
    <div class="footer">
      <p>Acest email a fost trimis de ${referrerName} prin platforma BlocX.</p>
      <p>© ${new Date().getFullYear()} BlocX - Administrare inteligentă</p>
    </div>
  </div>
</body>
</html>`
}

export async function sendReferralEmail(
  toEmail: string,
  referrerName: string,
  referralLink: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const html = buildReferralEmailHtml(referrerName, referralLink)
    const result = await sendEmail({
      to: toEmail,
      subject: `${referrerName} te invită pe BlocX — administrare de bloc gratuită`,
      html,
    })
    return { success: result.success }
  } catch (error) {
    console.error('[Referral Email] Error:', error)
    return { success: false, error: String(error) }
  }
}

// ─── WHATSAPP ────────────────────────────────────
// Uses Meta Cloud API directly (same pattern as @aledan/whatsapp)

function normalizePhone(phone: string, defaultCountry = '40'): string {
  let cleaned = phone.replace(/[\s\-().+]/g, '')
  if (cleaned.startsWith('00')) cleaned = cleaned.slice(2)
  if (cleaned.startsWith('0')) cleaned = defaultCountry + cleaned.slice(1)
  return cleaned
}

interface WhatsAppSendResult {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendReferralWhatsApp(
  toPhone: string,
  referrerName: string,
  referralLink: string
): Promise<WhatsAppSendResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    // Fallback: generate a WhatsApp click-to-chat link instead
    const phone = normalizePhone(toPhone)
    const text = encodeURIComponent(
      `Salut! ${referrerName} te invită pe BlocX — platforma care automatizează administrarea blocului. ` +
      `Este gratuit pentru max 20 apartamente!\n\n` +
      `Creează cont aici: ${referralLink}`
    )
    console.log(`[Referral WhatsApp] Click-to-chat: https://wa.me/${phone}?text=${text}`)
    return { success: true, messageId: `wa_link_${Date.now()}` }
  }

  try {
    const phone = normalizePhone(toPhone)
    const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`

    // Send as free-form text (within 24h window) or template
    // Using text message as it doesn't require Meta template approval
    const body = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: {
        preview_url: true,
        body: `🏢 *${referrerName}* te invită pe BlocX!\n\n` +
          `BlocX automatizează 95% din administrarea blocului:\n` +
          `✅ Chitanțe automate în 30 secunde\n` +
          `✅ Portal online pentru proprietari\n` +
          `✅ Plăți online cu cardul\n` +
          `✅ *Gratuit* pentru max 20 apartamente\n\n` +
          `👉 Creează cont: ${referralLink}`,
      },
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (res.ok && data.messages?.[0]?.id) {
      console.log(`[Referral WhatsApp] Sent to ${phone}: ${data.messages[0].id}`)
      return { success: true, messageId: data.messages[0].id }
    }

    console.error('[Referral WhatsApp] API error:', data)
    return { success: false, error: data.error?.message || 'WhatsApp API error' }
  } catch (error) {
    console.error('[Referral WhatsApp] Error:', error)
    return { success: false, error: String(error) }
  }
}

// ─── SMS ─────────────────────────────────────────
// Uses Twilio API (international, reliable)

interface SMSSendResult {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendReferralSMS(
  toPhone: string,
  referrerName: string,
  referralLink: string
): Promise<SMSSendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    console.log(`[Referral SMS] No Twilio credentials. Would send to ${toPhone}: ${referrerName} te invita pe BlocX: ${referralLink}`)
    return { success: true, messageId: `sms_dev_${Date.now()}` }
  }

  try {
    const phone = normalizePhone(toPhone)
    // Twilio needs E.164 format with +
    const twilioPhone = phone.startsWith('+') ? phone : `+${phone}`

    const message = `${referrerName} te invita pe BlocX! Administrare de bloc gratuita, 95% automatizare. Creaza cont: ${referralLink}`

    // Twilio REST API
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const body = new URLSearchParams({
      To: twilioPhone,
      From: fromNumber,
      Body: message,
    })

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    const data = await res.json()

    if (res.ok && data.sid) {
      console.log(`[Referral SMS] Sent to ${twilioPhone}: ${data.sid}`)
      return { success: true, messageId: data.sid }
    }

    console.error('[Referral SMS] Twilio error:', data)
    return { success: false, error: data.message || 'Twilio error' }
  } catch (error) {
    console.error('[Referral SMS] Error:', error)
    return { success: false, error: String(error) }
  }
}
