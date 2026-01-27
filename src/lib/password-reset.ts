import { db } from './db'
import crypto from 'crypto'

const TOKEN_EXPIRATION_HOURS = 1 // Token valid pentru 1 oră

/**
 * Generate a secure random token for password reset
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Create a password reset token for an email
 */
export async function createPasswordResetToken(email: string) {
  const token = generateResetToken()
  const expires = new Date()
  expires.setHours(expires.getHours() + TOKEN_EXPIRATION_HOURS)

  // Delete any existing tokens for this email
  await db.passwordResetToken.deleteMany({
    where: { email }
  })

  // Create new token
  const resetToken = await db.passwordResetToken.create({
    data: {
      email,
      token,
      expires,
    },
  })

  return resetToken
}

/**
 * Verify a reset token is valid
 */
export async function verifyResetToken(token: string) {
  const resetToken = await db.passwordResetToken.findUnique({
    where: { token },
  })

  if (!resetToken) {
    return { valid: false, error: 'Token invalid' }
  }

  if (resetToken.expires < new Date()) {
    // Token expired, delete it
    await db.passwordResetToken.delete({
      where: { token },
    })
    return { valid: false, error: 'Token expirat' }
  }

  return { valid: true, email: resetToken.email }
}

/**
 * Delete a reset token after use
 */
export async function deleteResetToken(token: string) {
  try {
    await db.passwordResetToken.delete({
      where: { token },
    })
  } catch (error) {
    // Token might already be deleted, ignore error
  }
}

/**
 * Clean up expired tokens (should run periodically)
 */
export async function cleanupExpiredTokens() {
  await db.passwordResetToken.deleteMany({
    where: {
      expires: {
        lt: new Date(),
      },
    },
  })
}
