import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const forgotPasswordSchema = z.object({
  email: z.string().email('Adresa de email invalidă'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = forgotPasswordSchema.parse(body)

    // Find user
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    // Always return success to prevent email enumeration
    // In production, send actual email if user exists
    if (user) {
      // TODO: Generate reset token and send email
      // For now, just log that we would send an email
      console.log(`[Password Reset] Would send email to: ${email}`)

      // In production, you would:
      // 1. Generate a secure token
      // 2. Store it in DB with expiration
      // 3. Send email with reset link
      // Example: await sendPasswordResetEmail(user.email, token)
    }

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000))

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
