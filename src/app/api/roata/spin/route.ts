import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ROATA_CONFIG, isCampaignActive, spin } from '@/lib/roata'

// Public — perform one server-decided spin. The UI animates to the returned value.
// Spins are ephemeral (not persisted); the binding constraint is the claim + the
// 12-month cap. 5/day + 1-min cooldown are enforced client-side for UX.
export async function POST() {
  try {
    if (!isCampaignActive()) {
      return NextResponse.json({ error: 'Campania nu este activă' }, { status: 403 })
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
