import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Missing signature or webhook secret' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent

      await db.plata.updateMany({
        where: { stripePaymentId: paymentIntent.id },
        data: {
          status: 'CONFIRMED',
          dataPlata: new Date(),
        },
      })

      const plata = await db.plata.findFirst({
        where: { stripePaymentId: paymentIntent.id },
        include: { chitanta: true },
      })

      if (plata) {
        const totalPlatit = await db.plata.aggregate({
          where: {
            chitantaId: plata.chitantaId,
            status: 'CONFIRMED',
          },
          _sum: { suma: true },
        })

        const sumaPlatita = totalPlatit._sum.suma || 0

        await db.chitanta.update({
          where: { id: plata.chitantaId },
          data: {
            status: sumaPlatita >= plata.chitanta.sumaTotal
              ? 'PLATITA'
              : 'PARTIAL_PLATITA',
          },
        })

        if (plata.userId) {
          await db.notificare.create({
            data: {
              tip: 'PLATA_CONFIRMATA',
              titlu: 'Plată confirmată',
              mesaj: `Plata de ${plata.suma.toFixed(2)} RON pentru chitanța ${plata.chitanta.numar}/${plata.chitanta.luna}/${plata.chitanta.an} a fost procesată cu succes.`,
              userId: plata.userId,
            },
          })
        }
      }
      break
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent

      await db.plata.updateMany({
        where: { stripePaymentId: paymentIntent.id },
        data: { status: 'FAILED' },
      })
      break
    }
  }

  return NextResponse.json({ received: true })
}
