import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { getCurrentTier, OFFER_CONFIG } from '@/lib/offer'

// Public route — NOT in middleware matcher, NOT a payment route.

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

const registrationSchema = z.object({
  name: z.string().min(2, 'Numele este obligatoriu').max(120),
  association: z.string().min(2, 'Asociația/blocul este obligatoriu').max(200),
  email: z.string().email('Email invalid').max(160),
  phone: z.string().min(6, 'Telefon invalid').max(40),
  city: z.string().min(2, 'Orașul este obligatoriu').max(120),
})

/** Start of the current weekly tier window (used for limited-spots counting). */
function currentWeekStart(weekIndex: number): Date {
  return new Date(new Date(OFFER_CONFIG.start).getTime() + weekIndex * MS_PER_WEEK)
}

async function spotsRemaining(weekIndex: number, spotsTotal: number): Promise<number> {
  const used = await db.earlyAdopterRegistration.count({
    where: { createdAt: { gte: currentWeekStart(weekIndex) } },
  })
  return Math.max(0, spotsTotal - used)
}

// GET — public offer status. Returns ONLY the current tier (never the schedule).
export async function GET() {
  try {
    const tier = getCurrentTier()
    const remaining = await spotsRemaining(tier.weekIndex, tier.spotsTotal)
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
    const remainingBefore = await spotsRemaining(tier.weekIndex, tier.spotsTotal)

    // Always capture the lead (never lose a contact); `full` just signals the
    // weekly allotment was already reached so the UI can adjust the message.
    await db.earlyAdopterRegistration.create({
      data: { ...parsed.data, tierMonths: tier.tierMonths },
    })

    const remainingAfter = await spotsRemaining(tier.weekIndex, tier.spotsTotal)

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
