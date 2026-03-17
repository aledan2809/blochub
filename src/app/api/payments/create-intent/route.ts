import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { stripe, formatAmountForStripe, STRIPE_CONFIG } from '@/lib/stripe'
import { z } from 'zod'
import { checkRateLimit, getClientIdentifier, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit'

const createIntentSchema = z.object({
  chitantaId: z.string().min(1, 'ID chitanță necesar'),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for payment operations
    const clientId = getClientIdentifier(request)
    const rateLimitResult = checkRateLimit(`payment-intent:${clientId}`, RATE_LIMIT_CONFIGS.api)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Prea multe cereri. Te rugăm să aștepți.' },
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

    const body = await request.json()
    const { chitantaId } = createIntentSchema.parse(body)

    const chitanta = await db.chitanta.findUnique({
      where: { id: chitantaId },
      include: {
        apartament: true,
        asociatie: true,
      },
    })

    if (!chitanta) {
      return NextResponse.json(
        { error: 'Chitanța nu a fost găsită' },
        { status: 404 }
      )
    }

    const platiAggregate = await db.plata.aggregate({
      where: {
        chitantaId: chitanta.id,
        status: 'CONFIRMED',
      },
      _sum: { suma: true },
    })
    const sumaRamasa = chitanta.sumaTotal - (platiAggregate._sum.suma || 0)

    if (sumaRamasa <= 0) {
      return NextResponse.json(
        { error: 'Chitanța este deja plătită' },
        { status: 400 }
      )
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: formatAmountForStripe(sumaRamasa),
      currency: STRIPE_CONFIG.currency,
      metadata: {
        chitantaId: chitanta.id,
        apartamentId: chitanta.apartamentId,
        asociatieId: chitanta.asociatieId,
        userId: (session.user as any).id,
      },
      description: `Plată chitanță ${chitanta.numar}/${chitanta.luna}/${chitanta.an} - ${chitanta.asociatie.nume}`,
    })

    await db.plata.create({
      data: {
        suma: sumaRamasa,
        metodaPlata: 'CARD',
        status: 'PENDING',
        stripePaymentId: paymentIntent.id,
        chitantaId: chitanta.id,
        apartamentId: chitanta.apartamentId,
        userId: (session.user as any).id,
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount: sumaRamasa,
    })
  } catch (error) {
    console.error('Stripe create intent error:', error)
    return NextResponse.json(
      { error: 'Eroare la crearea plății' },
      { status: 500 }
    )
  }
}
