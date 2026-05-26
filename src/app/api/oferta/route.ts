import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { getCurrentTier } from '@/lib/offer'

// Public route — NOT in middleware matcher, NOT a payment route.

const registrationSchema = z.object({
  name: z.string().min(2, 'Numele este obligatoriu').max(120),
  association: z.string().min(2, 'Asociația/blocul este obligatoriu').max(200),
  email: z.string().email('Email invalid').max(160),
  phone: z.string().min(6, 'Telefon invalid').max(40),
  city: z.string().min(2, 'Orașul este obligatoriu').max(120),
})

// Spots are limited PER TIER (per free-months value). Each distinct weekly
// tier (12, 11, …, 7) gets a fresh allotment; the 6-month floor is terminal.
// Counting by tierMonths (not a time window) also works pre-launch — early
// birds consume the opening tier's spots.
async function spotsRemaining(tierMonths: number, spotsTotal: number): Promise<number> {
  const used = await db.earlyAdopterRegistration.count({ where: { tierMonths } })
  return Math.max(0, spotsTotal - used)
}

// GET — public offer status. Returns ONLY the current tier (never the schedule).
export async function GET() {
  try {
    const tier = getCurrentTier()
    const remaining = await spotsRemaining(tier.tierMonths, tier.spotsTotal)
    return NextResponse.json({
      tierMonths: tier.tierMonths,
      spotsRemaining: remaining,
      spotsTotal: tier.spotsTotal,
    })
  } catch (error) {
    console.error('GET /api/oferta error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// POST — capture an early-adopter lead. tierMonths is computed server-side.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = registrationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Date invalide', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const tier = getCurrentTier()
    const remainingBefore = await spotsRemaining(tier.tierMonths, tier.spotsTotal)

    // Always capture the lead (never lose a contact); `full` just signals the
    // tier allotment was already reached so the UI can adjust the message.
    await db.earlyAdopterRegistration.create({
      data: { ...parsed.data, tierMonths: tier.tierMonths },
    })

    const remainingAfter = await spotsRemaining(tier.tierMonths, tier.spotsTotal)

    return NextResponse.json(
      {
        ok: true,
        tierMonths: tier.tierMonths,
        full: remainingBefore <= 0,
        spotsRemaining: remainingAfter,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/oferta error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
