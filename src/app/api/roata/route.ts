import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ROATA_CONFIG, campaignWindow, isCampaignActive } from '@/lib/roata'

// Public — wheel campaign status.
export async function GET() {
  try {
    const { end } = campaignWindow()
    const twelveClaimed = await db.earlyAdopterRegistration.count({
      where: { source: 'roata', freeMonths: 12 },
    })
    return NextResponse.json({
      active: isCampaignActive(),
      endsAt: end.toISOString(),
      segments: ROATA_CONFIG.segments,
      spinsPerDay: ROATA_CONFIG.spinsPerDay,
      cooldownSec: ROATA_CONFIG.cooldownSec,
      maxTwelve: ROATA_CONFIG.maxTwelve,
      twelveClaimed,
      twelveRemaining: Math.max(0, ROATA_CONFIG.maxTwelve - twelveClaimed),
    })
  } catch (error) {
    console.error('GET /api/roata error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
