import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { ROATA_CONFIG, isCampaignActive } from '@/lib/roata'

// Public — claim the chosen wheel result (locks the free months to an account-lead).
const claimSchema = z.object({
  name: z.string().min(2, 'Numele este obligatoriu').max(120),
  association: z.string().min(2, 'Asociația/blocul este obligatoriu').max(200),
  email: z.string().email('Email invalid').max(160),
  phone: z.string().min(6, 'Telefon invalid').max(40),
  city: z.string().min(2, 'Orașul este obligatoriu').max(120),
  freeMonths: z.number().int().min(1).max(ROATA_CONFIG.segments),
})

export async function POST(request: NextRequest) {
  try {
    if (!isCampaignActive()) {
      return NextResponse.json({ error: 'Campania nu este activă' }, { status: 403 })
    }
    const body = await request.json()
    const parsed = claimSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Date invalide', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { name, association, email, phone, city, freeMonths } = parsed.data

    // One claim per email.
    const existing = await db.earlyAdopterRegistration.findFirst({
      where: { email, source: 'roata' },
      select: { id: true, freeMonths: true },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Ai revendicat deja un rezultat cu acest email.', freeMonths: existing.freeMonths },
        { status: 409 }
      )
    }

    // 12-month prize cap.
    if (freeMonths === ROATA_CONFIG.segments) {
      const twelveClaimed = await db.earlyAdopterRegistration.count({
        where: { source: 'roata', freeMonths: ROATA_CONFIG.segments },
      })
      if (twelveClaimed >= ROATA_CONFIG.maxTwelve) {
        return NextResponse.json(
          { error: 'Locurile pentru 12 luni s-au epuizat. Mai învârte pentru alt rezultat.', soldOut: true },
          { status: 409 }
        )
      }
    }

    await db.earlyAdopterRegistration.create({
      data: { name, association, email, phone, city, tierMonths: freeMonths, freeMonths, source: 'roata' },
    })

    return NextResponse.json(
      { ok: true, freeMonths, message: `Ai blocat ${freeMonths} luni gratis pe BlocX. Te contactăm să-ți activăm contul.` },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/roata/claim error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
