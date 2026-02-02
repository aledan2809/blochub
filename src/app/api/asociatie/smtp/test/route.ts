import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import nodemailer from 'nodemailer'

// POST - Test SMTP configuration by sending a test email
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const body = await request.json()
    const { testEmail } = body

    if (!testEmail) {
      return NextResponse.json(
        { error: 'Email de test este obligatoriu' },
        { status: 400 }
      )
    }

    // Get user's asociatie
    const asociatie = await db.asociatie.findFirst({
      where: { adminId: userId },
      select: { id: true, nume: true },
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    // Get SMTP config
    const smtpConfig = await db.sMTPConfig.findUnique({
      where: { asociatieId: asociatie.id },
    })

    if (!smtpConfig) {
      return NextResponse.json(
        { error: 'Configurația SMTP nu există. Salvați configurația mai întâi.' },
        { status: 404 }
      )
    }

    // Create nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure, // true for 465, false for other ports
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.password,
      },
      // Timeout settings
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 10000,
    })

    // Verify connection
    try {
      await transporter.verify()
    } catch (verifyError: any) {
      // Update test status
      await db.sMTPConfig.update({
        where: { id: smtpConfig.id },
        data: {
          lastTest: new Date(),
          lastTestSuccess: false,
          lastTestError: `Conexiune eșuată: ${verifyError.message}`,
        },
      })

      return NextResponse.json({
        success: false,
        error: `Nu s-a putut conecta la serverul SMTP: ${verifyError.message}`,
      })
    }

    // Send test email
    const fromName = smtpConfig.fromName || asociatie.nume || 'BlocHub'

    try {
      await transporter.sendMail({
        from: `"${fromName}" <${smtpConfig.fromEmail}>`,
        to: testEmail,
        subject: '✅ Test SMTP - BlocHub',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
              .success { color: #059669; font-size: 24px; margin: 0; }
              .info { background: #dbeafe; padding: 15px; border-radius: 6px; margin-top: 15px; }
              .footer { color: #6b7280; font-size: 12px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 class="success">✅ Configurare SMTP reușită!</h1>
              </div>
              <div class="content">
                <p>Felicitări! Serverul SMTP este configurat corect pentru <strong>${asociatie.nume}</strong>.</p>

                <div class="info">
                  <strong>Detalii conexiune:</strong><br>
                  Server: ${smtpConfig.host}:${smtpConfig.port}<br>
                  Utilizator: ${smtpConfig.user}<br>
                  Email expeditor: ${smtpConfig.fromEmail}
                </div>

                <p style="margin-top: 20px;">
                  Notificările vor fi trimise de acum prin serverul SMTP configurat.
                </p>

                <div class="footer">
                  <p>Acest email a fost trimis automat de BlocHub pentru a testa configurația SMTP.</p>
                  <p>Data test: ${new Date().toLocaleString('ro-RO')}</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      })

      // Update test status - success
      await db.sMTPConfig.update({
        where: { id: smtpConfig.id },
        data: {
          lastTest: new Date(),
          lastTestSuccess: true,
          lastTestError: null,
        },
      })

      return NextResponse.json({
        success: true,
        message: `Email de test trimis cu succes la ${testEmail}`,
      })
    } catch (sendError: any) {
      // Update test status - failed
      await db.sMTPConfig.update({
        where: { id: smtpConfig.id },
        data: {
          lastTest: new Date(),
          lastTestSuccess: false,
          lastTestError: `Trimitere eșuată: ${sendError.message}`,
        },
      })

      return NextResponse.json({
        success: false,
        error: `Eroare la trimiterea email-ului: ${sendError.message}`,
      })
    }
  } catch (error: any) {
    console.error('SMTP test error:', error)
    return NextResponse.json(
      { error: `Eroare: ${error.message}` },
      { status: 500 }
    )
  }
}
