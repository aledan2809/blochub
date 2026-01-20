import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { stripe, formatAmountForStripe, STRIPE_CONFIG } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const body = await request.json()
    const { chitantaId } = body

    if (!chitantaId) {
      return NextResponse.json(
        { error: 'ID chitanță necesar' },
        { status: 400 }
      )
    }

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
