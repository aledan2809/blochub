/**
 * API Route: Create Subscription Payment
 *
 * Creates a payment order with Revolut for subscription billing.
 * POST /api/billing/create-payment
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getRevolutClient, calculateSubscriptionPrice } from '@/lib/revolut'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions)
    if (!(session?.user as any)?.id) {
      return NextResponse.json(
        { error: 'Nu sunteți autentificat' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { organizatieId, ciclulFacturare = 'LUNAR' } = body

    if (!organizatieId) {
      return NextResponse.json(
        { error: 'ID organizație lipsă' },
        { status: 400 }
      )
    }

    // Verify user has access to this organization
    const membership = await db.utilizatorOrganizatie.findFirst({
      where: {
        userId: (session!.user as any).id,
        organizatieId,
        esteActiv: true,
        rol: { in: ['OWNER', 'ADMIN'] },
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Nu aveți permisiunea de a efectua plăți pentru această organizație' },
        { status: 403 }
      )
    }

    // Get organization and subscription
    const organizatie = await db.organizatie.findUnique({
      where: { id: organizatieId },
      include: {
        abonament: {
          include: { plan: true },
        },
      },
    })

    if (!organizatie) {
      return NextResponse.json(
        { error: 'Organizația nu a fost găsită' },
        { status: 404 }
      )
    }

    if (!organizatie.abonament) {
      return NextResponse.json(
        { error: 'Organizația nu are un abonament activ' },
        { status: 400 }
      )
    }

    // FREE plan doesn't need payment
    if (organizatie.abonament.plan.cod === 'FREE') {
      return NextResponse.json(
        { error: 'Planul gratuit nu necesită plată' },
        { status: 400 }
      )
    }

    // Get Revolut client
    const revolut = await getRevolutClient()
    if (!revolut) {
      return NextResponse.json(
        { error: 'Sistemul de plăți nu este configurat' },
        { status: 500 }
      )
    }

    // Calculate price
    const pricing = await calculateSubscriptionPrice(organizatieId)

    // Adjust for billing cycle
    let multiplier = 1
    let perioadaText = 'lunar'
    switch (ciclulFacturare) {
      case 'TRIMESTRIAL':
        multiplier = 3
        perioadaText = 'trimestrial'
        break
      case 'ANUAL':
        multiplier = 12
        perioadaText = 'anual'
        break
    }

    const totalAmount = pricing.total * multiplier

    // Get app URL for redirects
    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    // Create a pending invoice record
    const now = new Date()
    const currentMonth = now.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })
    const invoiceNumber = `FA-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`

    const facturaAbonament = await db.facturaAbonament.create({
      data: {
        abonamentId: organizatie.abonament.id,
        numar: invoiceNumber,
        dataEmitere: now,
        dataScadenta: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
        perioada: currentMonth,
        nrApartamente: pricing.apartamente,
        pretUnitar: pricing.pretPerApartament,
        subtotal: pricing.subtotal * multiplier,
        tva: pricing.tva * multiplier,
        total: totalAmount,
        status: 'DRAFT',
      },
    })

    // Create Revolut order
    const revolutOrder = await revolut.createOrder({
      amount: totalAmount,
      merchantOrderRef: facturaAbonament.id,
      customerEmail: organizatie.emailFacturare || organizatie.email || (session!.user as any).email!,
      description: `BlocHub - Abonament ${organizatie.abonament.plan.nume} (${perioadaText}) - ${pricing.apartamente} apartamente`,
      redirectUrl: `${appUrl}/dashboard/billing/success?factura_id=${facturaAbonament.id}`,
      cancelUrl: `${appUrl}/dashboard/billing/failed?factura_id=${facturaAbonament.id}`,
    })

    // Update invoice with Revolut order ID
    await db.facturaAbonament.update({
      where: { id: facturaAbonament.id },
      data: {
        stripeInvoiceId: revolutOrder.id, // Using this field for Revolut order ID
        status: 'EMISA',
      },
    })

    // Return checkout URL
    return NextResponse.json({
      success: true,
      facturaId: facturaAbonament.id,
      paymentId: revolutOrder.id,
      checkoutUrl: revolutOrder.checkout_url,
      pricing: {
        apartamente: pricing.apartamente,
        pretPerApartament: pricing.pretPerApartament,
        subtotal: pricing.subtotal * multiplier,
        tva: pricing.tva * multiplier,
        total: totalAmount,
        ciclu: ciclulFacturare,
      },
    })
  } catch (error) {
    console.error('Create payment error:', error)
    return NextResponse.json(
      { error: 'Eroare la crearea plății', details: (error as Error).message },
      { status: 500 }
    )
  }
}
