import { Resend } from 'resend'
import nodemailer from 'nodemailer'
import { db } from '@/lib/db'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
  asociatieId?: string // Optional: if provided, uses asociatie's SMTP config
}

interface SMTPConfig {
  host: string
  port: number
  secure: boolean
  user: string
  password: string
  fromEmail: string
  fromName: string | null
}

// Cache for SMTP configs to avoid repeated DB queries
const smtpConfigCache = new Map<string, { config: SMTPConfig | null; timestamp: number }>()
const CACHE_TTL = 60000 // 1 minute cache

async function getSMTPConfig(asociatieId: string): Promise<SMTPConfig | null> {
  // Check cache first
  const cached = smtpConfigCache.get(asociatieId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.config
  }

  try {
    const config = await db.sMTPConfig.findUnique({
      where: { asociatieId },
      select: {
        host: true,
        port: true,
        secure: true,
        user: true,
        password: true,
        fromEmail: true,
        fromName: true,
        enabled: true,
      },
    })

    const result = config?.enabled ? config : null
    smtpConfigCache.set(asociatieId, { config: result, timestamp: Date.now() })
    return result
  } catch (error) {
    console.error('[Email] Error fetching SMTP config:', error)
    return null
  }
}

async function sendViaSMTP(
  smtpConfig: SMTPConfig,
  { to, subject, html }: { to: string | string[]; subject: string; html: string }
) {
  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.password,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  })

  const fromName = smtpConfig.fromName || 'BlocX'
  const result = await transporter.sendMail({
    from: `"${fromName}" <${smtpConfig.fromEmail}>`,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
  })

  return result
}

// Global SMTP config from env vars (fallback when no Resend and no per-asociatie SMTP)
function getGlobalSMTPConfig(): SMTPConfig | null {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null

  return {
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user,
    password: pass,
    fromEmail: process.env.SMTP_FROM_EMAIL || user,
    fromName: process.env.SMTP_FROM_NAME || 'BlocX',
  }
}

export async function sendEmail({ to, subject, html, from, asociatieId }: EmailOptions) {
  // 1. Try per-asociatie SMTP first (highest priority)
  if (asociatieId) {
    const smtpConfig = await getSMTPConfig(asociatieId)
    if (smtpConfig) {
      try {
        console.log(`[Email] Sending via asociatie SMTP (${smtpConfig.host})`)
        const result = await sendViaSMTP(smtpConfig, { to, subject, html })
        return { success: true, data: result, via: 'smtp' }
      } catch (error: any) {
        console.error('[Email] Asociatie SMTP error, falling back:', error.message)
      }
    }
  }

  // 2. Try Resend
  if (resend) {
    try {
      const result = await resend.emails.send({
        from: from || 'BlocX <notificari@blochub.ro>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      })
      return { success: true, data: result, via: 'resend' }
    } catch (error: any) {
      console.error('[Email] Resend error, falling back:', error.message)
    }
  }

  // 3. Try global SMTP (env vars: SMTP_HOST, SMTP_USER, SMTP_PASS)
  const globalSmtp = getGlobalSMTPConfig()
  if (globalSmtp) {
    try {
      console.log(`[Email] Sending via global SMTP (${globalSmtp.host})`)
      const result = await sendViaSMTP(globalSmtp, { to, subject, html })
      return { success: true, data: result, via: 'global-smtp' }
    } catch (error: any) {
      console.error('[Email] Global SMTP error:', error.message)
      return { success: false, error: error.message }
    }
  }

  // 4. No email service available — log in dev mode
  console.log('[Email] No email service configured. Would send:')
  console.log(`  To: ${Array.isArray(to) ? to.join(', ') : to}`)
  console.log(`  Subject: ${subject}`)
  return { success: false, error: 'No email service configured' }
}

// Clear SMTP config cache (call after config update)
export function clearSMTPConfigCache(asociatieId: string) {
  smtpConfigCache.delete(asociatieId)
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
    subject: `[BlocX] Sesizare nouă: ${ticket.titlu}`,
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
      <p>Ai primit acest email pentru că ești administrator al asociației pe BlocX.</p>
      <p>© ${new Date().getFullYear()} BlocX - Administrare inteligentă</p>
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
    subject: `[BlocX] Sesizare actualizată: ${ticket.titlu}`,
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
      <p>Ai primit acest email pentru că ai raportat această sesizare pe BlocX.</p>
      <p>© ${new Date().getFullYear()} BlocX - Administrare inteligentă</p>
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
    subject: `[BlocX] Reminder: Chitanță de plată - ${data.suma} lei`,
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
      <p>Ai primit acest email pentru că ești proprietar înregistrat pe BlocX.</p>
      <p>© ${new Date().getFullYear()} BlocX - Administrare inteligentă</p>
    </div>
  </div>
</body>
</html>
    `
  }),

  restantaNotification: (data: {
    nume: string
    apartament: string
    sumaRestanta: number
    penalizare: number
    totalDePlata: number
    zileLate: number
    penalizareZi: number
    asociatie: string
    link: string
  }) => ({
    subject: `[BlocX] ⚠️ Restanță întreținere - ${data.totalDePlata.toLocaleString('ro-RO')} lei`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #374151; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc2626, #ea580c); color: white; padding: 24px; border-radius: 12px 12px 0 0; }
    .content { background: #f9fafb; padding: 24px; border-radius: 0 0 12px 12px; }
    .warning-box { background: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #dc2626; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .details-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    .details-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
    .details-table tr:last-child td { border-bottom: none; font-weight: bold; background: #fef3c7; }
    .amount { font-size: 28px; font-weight: bold; color: #dc2626; }
    .btn { display: inline-block; background: #dc2626; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 16px; }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">⚠️ Notificare Restanță</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">${data.asociatie} - Apt. ${data.apartament}</p>
    </div>
    <div class="content">
      <p>Stimate/ă ${data.nume},</p>

      <div class="warning-box">
        <strong>Aveți o restanță de ${data.zileLate} zile la plata întreținerii!</strong>
      </div>

      <table class="details-table">
        <tr>
          <td>Sumă restantă:</td>
          <td style="text-align: right;">${data.sumaRestanta.toLocaleString('ro-RO')} lei</td>
        </tr>
        <tr>
          <td>Penalizare (${data.penalizareZi}% × ${data.zileLate} zile):</td>
          <td style="text-align: right; color: #dc2626;">${data.penalizare.toLocaleString('ro-RO')} lei</td>
        </tr>
        <tr>
          <td>TOTAL DE PLATĂ:</td>
          <td style="text-align: right;"><span class="amount">${data.totalDePlata.toLocaleString('ro-RO')} lei</span></td>
        </tr>
      </table>

      <p style="color: #dc2626; font-weight: 500;">
        ⚠️ Penalizările cresc zilnic cu ${data.penalizareZi}% din suma restantă.
      </p>

      <p>Vă rugăm să efectuați plata cât mai curând posibil pentru a evita acumularea de penalizări suplimentare.</p>

      <a href="${data.link}" class="btn">Plătește acum</a>

      <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
        Poți plăti online cu cardul sau prin transfer bancar în contul asociației.
      </p>
    </div>
    <div class="footer">
      <p>Ai primit acest email pentru că ești proprietar înregistrat pe BlocX.</p>
      <p>© ${new Date().getFullYear()} BlocX - Administrare inteligentă</p>
    </div>
  </div>
</body>
</html>
    `
  }),

  weeklySummary: (data: {
    numeAdmin: string
    asociatie: string
    perioada: string
    totalRestante: number
    sumaRestante: number
    chitanteNoi: number
    sumaIncasata: number
    topRestantieri: Array<{ apartament: string; suma: number; zile: number }>
    link: string
  }) => ({
    subject: `[BlocX] Rezumat săptămânal - ${data.asociatie}`,
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
    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
    .stat-card { background: white; padding: 16px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; color: #111827; }
    .stat-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .warning { color: #dc2626; }
    .success { color: #16a34a; }
    .top-list { background: white; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .top-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .top-item:last-child { border-bottom: none; }
    .btn { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 16px; }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">📊 Rezumat Săptămânal</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">${data.asociatie} • ${data.perioada}</p>
    </div>
    <div class="content">
      <p>Bună ${data.numeAdmin},</p>
      <p>Iată rezumatul activității asociației din ultima săptămână:</p>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value success">${data.sumaIncasata.toLocaleString('ro-RO')} lei</div>
          <div class="stat-label">Încasat această săptămână</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.chitanteNoi}</div>
          <div class="stat-label">Chitanțe achitate</div>
        </div>
        <div class="stat-card">
          <div class="stat-value warning">${data.sumaRestante.toLocaleString('ro-RO')} lei</div>
          <div class="stat-label">Total restanțe</div>
        </div>
        <div class="stat-card">
          <div class="stat-value warning">${data.totalRestante}</div>
          <div class="stat-label">Apartamente restante</div>
        </div>
      </div>

      ${data.topRestantieri.length > 0 ? `
      <div class="top-list">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #dc2626;">⚠️ Top Restanțieri</h3>
        ${data.topRestantieri.map(r => `
          <div class="top-item">
            <span><strong>Apt. ${r.apartament}</strong> (${r.zile} zile)</span>
            <span class="warning"><strong>${r.suma.toLocaleString('ro-RO')} lei</strong></span>
          </div>
        `).join('')}
      </div>
      ` : '<p style="color: #16a34a;">✅ Nu există restanțe semnificative!</p>'}

      <a href="${data.link}" class="btn">Vezi detalii în dashboard</a>
    </div>
    <div class="footer">
      <p>Ai primit acest email pentru că ești administrator al asociației pe BlocX.</p>
      <p>© ${new Date().getFullYear()} BlocX - Administrare inteligentă</p>
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
      subject: 'BlocX - Resetare Parolă',
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
      <p style="margin: 8px 0 0 0; opacity: 0.95; font-size: 14px;">BlocX</p>
    </div>
    <div class="content">
      <h2 style="margin-top: 0; color: #111827;">Salut!</h2>
      <p>Ai solicitat resetarea parolei pentru contul tău BlocX asociat cu adresa <strong>${data.email}</strong>.</p>

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
      <p><strong>BlocX</strong> - Administrare inteligentă</p>
      <p>© ${new Date().getFullYear()} BlocX. Toate drepturile rezervate.</p>
      <p style="margin-top: 12px;">Acest email a fost trimis automat. Te rugăm să nu răspunzi.</p>
    </div>
  </div>
</body>
</html>
      `
    }
  },
}
