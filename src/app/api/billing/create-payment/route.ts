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
import { getRevolutClient, calculateSubscriptionPrice, validateRevolutConfig } from '@/lib/revolut'
import { z } from 'zod'
import { checkRateLimit, getClientIdentifier, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit'

const createPaymentSchema = z.object({
  organizatieId: z.string().min(1, 'ID organizație lipsă'),
  ciclulFacturare: z.enum(['LUNAR', 'TRIMESTRIAL', 'ANUAL']).optional().default('LUNAR'),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for billing operations
    const clientId = getClientIdentifier(request)
    const rateLimitResult = checkRateLimit(`billing:${clientId}`, RATE_LIMIT_CONFIGS.api)

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

    // Verify authentication
    const session = await getServerSession(authOptions)
    if (!(session?.user as any)?.id) {
      return NextResponse.json(
        { error: 'Nu sunteți autentificat' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createPaymentSchema.parse(body)
    const { organizatieId, ciclulFacturare } = validatedData

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

    // Validate Revolut configuration
    const configValidation = validateRevolutConfig()
    if (!configValidation.configured) {
      return NextResponse.json(
        { error: 'Sistemul de plăți Revolut nu este configurat' },
        { status: 500 }
      )
    }
    if (!configValidation.valid) {
      console.error('Revolut configuration errors:', configValidation.errors)
      return NextResponse.json(
        { error: 'Configurație Revolut invalidă', details: configValidation.errors },
        { status: 500 }
      )
    }

    // Get Revolut client
    const revolut = await getRevolutClient()
    if (!revolut) {
      return NextResponse.json(
        { error: 'Nu s-a putut inițializa clientul Revolut' },
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
      description: `BlocX - Abonament ${organizatie.abonament.plan.nume} (${perioadaText}) - ${pricing.apartamente} apartamente`,
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Create payment error:', error)
    return NextResponse.json(
      { error: 'Eroare la crearea plății', details: (error as Error).message },
      { status: 500 }
    )
  }
}
