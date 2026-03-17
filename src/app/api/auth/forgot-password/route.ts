import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createPasswordResetToken } from '@/lib/password-reset'
import { sendEmail, emailTemplates } from '@/lib/email'
import { checkRateLimit, getClientIdentifier, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit'

const forgotPasswordSchema = z.object({
  email: z.string().email('Adresa de email invalidă'),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - use strict passwordReset config
    const clientId = getClientIdentifier(request)
    const rateLimitResult = checkRateLimit(`forgot-password:${clientId}`, RATE_LIMIT_CONFIGS.passwordReset)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Prea multe încercări. Te rugăm să aștepți câteva minute.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          }
        }
      )
    }

    const body = await request.json()
    const { email } = forgotPasswordSchema.parse(body)

    // Find user
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    // Always return success to prevent email enumeration
    // But actually send email if user exists
    if (user) {
      try {
        // Generate and store reset token
        const resetToken = await createPasswordResetToken(user.email)

        // Send password reset email
        const emailTemplate = emailTemplates.passwordReset({
          email: user.email,
          resetToken: resetToken.token,
          expiresInHours: 1,
        })

        await sendEmail({
          to: user.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
        })

        console.log(`[Password Reset] Email sent to: ${email}`)
      } catch (emailError) {
        // Log error but don't reveal to user
        console.error('[Password Reset] Failed to send email:', emailError)
      }
    } else {
      // Still wait to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return NextResponse.json({
      success: true,
      message: 'Dacă emailul există, vei primi un link de resetare',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Eroare la procesarea cererii' },
      { status: 500 }
    )
  }
}
