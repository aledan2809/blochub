import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { verifyResetToken, deleteResetToken } from '@/lib/password-reset'
import bcrypt from 'bcryptjs'

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token necesar'),
  password: z.string().min(6, 'Parola trebuie să aibă minim 6 caractere'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = resetPasswordSchema.parse(body)

    // Verify token is valid
    const verification = await verifyResetToken(token)

    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || 'Token invalid' },
        { status: 400 }
      )
    }

    // Find user by email from token
    const user = await db.user.findUnique({
      where: { email: verification.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilizator negăsit' },
        { status: 404 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update user password
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    // Delete the used token
    await deleteResetToken(token)

    console.log(`[Password Reset] Password reset successful for: ${verification.email}`)

    return NextResponse.json({
      success: true,
      message: 'Parola a fost resetată cu succes',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Eroare la resetarea parolei' },
      { status: 500 }
    )
  }
}

// GET endpoint to verify token validity
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token necesar' },
        { status: 400 }
      )
    }

    const verification = await verifyResetToken(token)

    if (!verification.valid) {
      return NextResponse.json(
        { valid: false, error: verification.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      email: verification.email,
    })
  } catch (error) {
    console.error('Token verification error:', error)
    return NextResponse.json(
      { error: 'Eroare la verificarea tokenului' },
      { status: 500 }
    )
  }
}
