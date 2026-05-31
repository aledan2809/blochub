import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ROATA_CONFIG, isCampaignActive, spin } from '@/lib/roata'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'

// Public — perform one server-decided spin. The UI animates to the returned value.
// Spins are ephemeral (not persisted); the binding constraint is the claim + the
// 12-month cap. 5/day + 1-min cooldown are enforced client-side for UX.
export async function POST(request: NextRequest) {
  try {
    if (!isCampaignActive()) {
      return NextResponse.json({ error: 'Campania nu este activă' }, { status: 403 })
    }
    // Server-side throttle (G-BLOC-012): client enforces the daily/cooldown UX
    // limits; this caps automated loops that would otherwise spin repeatedly to
    // land on the best tier before claiming.
    // NOTE: in-memory limiter — adequate on the current single-process (PM2
    // `next start`) deploy. If blochub ever runs multi-instance/serverless, swap
    // to a shared store (Redis). The hard cap stays the persisted 12-month claim
    // limit (EarlyAdopterRegistration), not this soft deterrent.
    const rl = checkRateLimit(`roata-spin:${getClientIdentifier(request)}`, {
      windowMs: 60 * 1000,
      max: 10,
    })
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Prea multe învârtiri. Încearcă din nou peste un minut.' },
        { status: 429 }
      )
    }
    const twelveClaimed = await db.earlyAdopterRegistration.count({
      where: { source: 'roata', freeMonths: 12 },
    })
    const twelveSoldOut = twelveClaimed >= ROATA_CONFIG.maxTwelve
    const months = spin(twelveSoldOut)
    return NextResponse.json({ months, twelveSoldOut })
  } catch (error) {
    console.error('POST /api/roata/spin error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
