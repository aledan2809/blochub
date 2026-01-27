import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

export async function sendEmail({ to, subject, html, from }: EmailOptions) {
  // If no API key, just log (development mode)
  if (!resend) {
    console.log('[Email] Would send email:')
    console.log(`  To: ${Array.isArray(to) ? to.join(', ') : to}`)
    console.log(`  Subject: ${subject}`)
    console.log(`  HTML: ${html.substring(0, 200)}...`)
    return { success: true, development: true }
  }

  try {
    const result = await resend.emails.send({
      from: from || 'BlocHub <notificari@blochub.ro>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    })

    return { success: true, data: result }
  } catch (error) {
    console.error('[Email] Error sending email:', error)
    return { success: false, error }
  }
}

// Email templates
export const emailTemplates = {
  newTicket: (ticket: {
    titlu: string
    descriere: string
    categorie: string
    prioritate: string
    autor: string
    apartament?: string
    link: string
  }) => ({
    subject: `[BlocHub] Sesizare nouă: ${ticket.titlu}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #374151; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2563eb, #4f46e5); color: white; padding: 24px; border-radius: 12px 12px 0 0; }
    .content { background: #f9fafb; padding: 24px; border-radius: 0 0 12px 12px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 500; }
    .badge-urgenta { background: #fef2f2; color: #dc2626; }
    .badge-normala { background: #fffbeb; color: #d97706; }
    .badge-scazuta { background: #f0fdf4; color: #16a34a; }
    .btn { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 16px; }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">Sesizare Nouă</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">${ticket.categorie}</p>
    </div>
    <div class="content">
      <h2 style="margin-top: 0; color: #111827;">${ticket.titlu}</h2>

      <p><strong>Prioritate:</strong>
        <span class="badge badge-${ticket.prioritate.toLowerCase()}">${ticket.prioritate}</span>
      </p>

      <p><strong>De la:</strong> ${ticket.autor}${ticket.apartament ? ` (Apt. ${ticket.apartament})` : ''}</p>

      <div style="background: white; padding: 16px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 16px 0;">
        <p style="margin: 0;">${ticket.descriere}</p>
      </div>

      <a href="${ticket.link}" class="btn">Vezi sesizarea</a>
    </div>
    <div class="footer">
      <p>Ai primit acest email pentru că ești administrator al asociației pe BlocHub.</p>
      <p>© ${new Date().getFullYear()} BlocHub - Administrare inteligentă</p>
    </div>
  </div>
</body>
</html>
    `
  }),

  ticketStatusUpdate: (ticket: {
    titlu: string
    status: string
    comentariu?: string
    link: string
  }) => ({
    subject: `[BlocHub] Sesizare actualizată: ${ticket.titlu}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #374151; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #16a34a, #059669); color: white; padding: 24px; border-radius: 12px 12px 0 0; }
    .content { background: #f9fafb; padding: 24px; border-radius: 0 0 12px 12px; }
    .status { display: inline-block; padding: 8px 16px; border-radius: 8px; font-weight: 600; background: #dcfce7; color: #16a34a; }
    .btn { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 16px; }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">Sesizare Actualizată</h1>
    </div>
    <div class="content">
      <h2 style="margin-top: 0; color: #111827;">${ticket.titlu}</h2>

      <p><strong>Status nou:</strong> <span class="status">${ticket.status}</span></p>

      ${ticket.comentariu ? `
      <div style="background: white; padding: 16px; border-radius: 8px; border-left: 4px solid #16a34a; margin: 16px 0;">
        <p style="margin: 0; font-weight: 500;">Comentariu administrator:</p>
        <p style="margin: 8px 0 0 0;">${ticket.comentariu}</p>
      </div>
      ` : ''}

      <a href="${ticket.link}" class="btn">Vezi detalii</a>
    </div>
    <div class="footer">
      <p>Ai primit acest email pentru că ai raportat această sesizare pe BlocHub.</p>
      <p>© ${new Date().getFullYear()} BlocHub - Administrare inteligentă</p>
    </div>
  </div>
</body>
</html>
    `
  }),

  paymentReminder: (data: {
    nume: string
    apartament: string
    suma: number
    scadenta: string
    link: string
  }) => ({
    subject: `[BlocHub] Reminder: Chitanță de plată - ${data.suma} lei`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #374151; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2563eb, #4f46e5); color: white; padding: 24px; border-radius: 12px 12px 0 0; }
    .content { background: #f9fafb; padding: 24px; border-radius: 0 0 12px 12px; }
    .amount { font-size: 32px; font-weight: bold; color: #111827; }
    .btn { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 16px; }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">Reminder Plată</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">Apt. ${data.apartament}</p>
    </div>
    <div class="content">
      <p>Bună ${data.nume},</p>

      <p>Îți reamintim că ai de achitat întreținerea în valoare de:</p>

      <p class="amount">${data.suma.toLocaleString('ro-RO')} lei</p>

      <p><strong>Scadență:</strong> ${data.scadenta}</p>

      <a href="${data.link}" class="btn">Plătește acum</a>

      <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
        Poți plăti online cu cardul sau prin transfer bancar în contul asociației.
      </p>
    </div>
    <div class="footer">
      <p>Ai primit acest email pentru că ești proprietar înregistrat pe BlocHub.</p>
      <p>© ${new Date().getFullYear()} BlocHub - Administrare inteligentă</p>
    </div>
  </div>
</body>
</html>
    `
  }),

  passwordReset: (data: {
    email: string
    resetToken: string
    expiresInHours: number
  }) => {
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${data.resetToken}`

    return {
      subject: 'BlocHub - Resetare Parolă',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2563eb, #4f46e5); color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
    .btn { display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .warning { background: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0; }
    .link { word-break: break-all; color: #2563eb; font-size: 14px; background: white; padding: 12px; border-radius: 6px; margin: 16px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">🔐 Resetare Parolă</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.95; font-size: 14px;">BlocHub</p>
    </div>
    <div class="content">
      <h2 style="margin-top: 0; color: #111827;">Salut!</h2>
      <p>Ai solicitat resetarea parolei pentru contul tău BlocHub asociat cu adresa <strong>${data.email}</strong>.</p>

      <p>Apasă butonul de mai jos pentru a-ți reseta parola:</p>

      <div style="text-align: center;">
        <a href="${resetUrl}" class="btn">Resetează Parola</a>
      </div>

      <p style="margin-top: 24px;">Sau copiază și lipește acest link în browser:</p>
      <div class="link">${resetUrl}</div>

      <div class="warning">
        <strong>⏰ Atenție:</strong> Acest link este valabil doar pentru <strong>${data.expiresInHours} oră</strong>. După expirare, va trebui să soliciți un nou link de resetare.
      </div>

      <p style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
        <strong>Nu ai solicitat resetarea parolei?</strong><br>
        Dacă nu ai fost tu, ignoră acest email. Parola ta va rămâne neschimbată și nimeni nu va putea accesa contul tău.
      </p>
    </div>
    <div class="footer">
      <p><strong>BlocHub</strong> - Administrare inteligentă</p>
      <p>© ${new Date().getFullYear()} BlocHub. Toate drepturile rezervate.</p>
      <p style="margin-top: 12px;">Acest email a fost trimis automat. Te rugăm să nu răspunzi.</p>
    </div>
  </div>
</body>
</html>
      `
    }
  },
}
