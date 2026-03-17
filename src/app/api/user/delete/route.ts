/**
 * API Route: GDPR Account Delete
 *
 * Soft deletes user account and anonymizes personal data per GDPR requirements.
 * POST /api/user/delete
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { checkRateLimit, getClientIdentifier, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit'

const deleteAccountSchema = z.object({
  confirmation: z.literal('DELETE', {
    errorMap: () => ({ message: 'Confirmarea este incorectă. Scrieți "DELETE" pentru a confirma.' })
  }),
})

export async function POST(request: NextRequest) {
  try {
    // Strict rate limiting for account deletion (very sensitive operation)
    const clientId = getClientIdentifier(request)
    const rateLimitResult = checkRateLimit(`account-delete:${clientId}`, RATE_LIMIT_CONFIGS.passwordReset)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Prea multe încercări. Te rugăm să aștepți.' },
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

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as any).id

    // Parse and validate confirmation
    const body = await request.json()
    const { confirmation } = deleteAccountSchema.parse(body)

    // Check if user exists and is not already deleted
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        deletedAt: true,
        asociatiiAdmin: { select: { id: true } },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilizator negăsit' }, { status: 404 })
    }

    if (user.deletedAt) {
      return NextResponse.json(
        { error: 'Contul a fost deja șters' },
        { status: 400 }
      )
    }

    // Check if user is an admin of any association
    if (user.asociatiiAdmin.length > 0) {
      return NextResponse.json(
        {
          error: 'Nu puteți șterge contul deoarece sunteți administrator la una sau mai multe asociații. Transferați mai întâi drepturile de administrator.'
        },
        { status: 400 }
      )
    }

    // Generate anonymous identifier
    const anonymousId = randomBytes(8).toString('hex')

    // Perform soft delete with anonymization
    await db.$transaction(async (tx) => {
      // Update user - soft delete and anonymize
      await tx.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          email: `deleted_${anonymousId}@deleted.blochub.ro`,
          name: `Utilizator șters`,
          phone: null,
          password: null,
          image: null,
        },
      })

      // Delete all sessions to force logout
      await tx.session.deleteMany({
        where: { userId },
      })

      // Delete all accounts (OAuth)
      await tx.account.deleteMany({
        where: { userId },
      })

      // Anonymize ticket comments
      await tx.comentariuTichet.updateMany({
        where: { autorId: userId },
        data: {
          continut: '[Conținut șters la cererea utilizatorului]',
        },
      })

      // Delete notifications
      await tx.notificare.deleteMany({
        where: { userId },
      })

      // Record a consent entry for the deletion
      await tx.consent.create({
        data: {
          userId,
          type: 'DATA_PROCESSING',
          granted: false,
          version: '1.0',
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
          userAgent: request.headers.get('user-agent') || null,
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Contul a fost șters cu succes. Veți fi deconectat automat.',
    })
  } catch (error) {
    console.error('GDPR delete error:', error)
    return NextResponse.json(
      { error: 'Eroare la ștergerea contului' },
      { status: 500 }
    )
  }
}
