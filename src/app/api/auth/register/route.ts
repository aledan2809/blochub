import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { checkRateLimit, getClientIdentifier, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit'

const registerSchema = z.object({
  email: z.string().email('Email invalid'),
  password: z.string().min(8, 'Parola trebuie să aibă minim 8 caractere'),
  name: z.string().min(2, 'Numele trebuie să aibă minim 2 caractere'),
  phone: z.string().optional(),
  referralCode: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request)
    const rateLimitResult = checkRateLimit(`register:${clientId}`, RATE_LIMIT_CONFIGS.auth)

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
    const data = registerSchema.parse(body)

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Un cont cu acest email există deja' },
        { status: 400 }
      )
    }

    // Create user
    const hashedPassword = await hashPassword(data.password)

    const user = await db.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        phone: data.phone,
        role: 'ADMIN',
        referredByCode: data.referralCode || null,
      },
    })

    // Process referral if code provided
    if (data.referralCode) {
      const referrer = await db.user.findUnique({
        where: { referralCode: data.referralCode },
        select: { id: true },
      })

      if (referrer) {
        // Update existing PENDING referral or create new one
        const existingReferral = await db.referral.findFirst({
          where: {
            referrerId: referrer.id,
            referredEmail: data.email.toLowerCase(),
            status: 'PENDING',
          },
        })

        if (existingReferral) {
          await db.referral.update({
            where: { id: existingReferral.id },
            data: {
              referredId: user.id,
              status: 'REGISTERED',
              registeredAt: new Date(),
            },
          })
        } else {
          await db.referral.create({
            data: {
              referrerId: referrer.id,
              referredId: user.id,
              referralCode: data.referralCode,
              referredEmail: data.email.toLowerCase(),
              status: 'REGISTERED',
              registeredAt: new Date(),
            },
          })
        }
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Eroare la înregistrare. Încearcă din nou.' },
      { status: 500 }
    )
  }
}
