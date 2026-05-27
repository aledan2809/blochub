/**
 * "Roata norocului" (lucky wheel) config + server-side outcome — early-adopter promo.
 *
 * Clock wheel 1..12 = free months. Server decides each spin (the UI animation just
 * lands on it) so the result can't be faked client-side. Players get 5 spins/day
 * with a 1-minute cooldown between spins and keep the BEST of the day (max 12);
 * unhappy players can return the next day. The 12-month prize is capped at
 * MAX_TWELVE accounts — once reached, 12 is "sold out" and excluded from outcomes.
 * Campaign runs DURATION_DAYS from START.
 *
 * Env-tunable (set on VPS + pm2 restart):
 *   BLOCHUB_ROATA_START      ISO start date          (default 2026-05-27)
 *   BLOCHUB_ROATA_DAYS       campaign length in days (default 7)
 *   BLOCHUB_ROATA_MAX12      accounts allowed at 12mo (default 20)
 */
const MS_PER_DAY = 24 * 60 * 60 * 1000

function envInt(name: string, fallback: number): number {
  const n = parseInt(process.env[name] || '', 10)
  return Number.isFinite(n) ? n : fallback
}

export const ROATA_CONFIG = {
  start: process.env.BLOCHUB_ROATA_START || '2026-05-27',
  days: envInt('BLOCHUB_ROATA_DAYS', 7),
  maxTwelve: envInt('BLOCHUB_ROATA_MAX12', 20),
  segments: 12, // clock 1..12
  spinsPerDay: 5,
  cooldownSec: 60,
}

export function campaignWindow(): { start: Date; end: Date } {
  const start = new Date(ROATA_CONFIG.start)
  const end = new Date(start.getTime() + ROATA_CONFIG.days * MS_PER_DAY)
  return { start, end }
}

export function isCampaignActive(now: Date = new Date()): boolean {
  const { start, end } = campaignWindow()
  return now >= start && now < end
}

/** One spin result (1..segments). Excludes 12 when the 12-month prize is sold out. */
export function spin(twelveSoldOut: boolean): number {
  const max = twelveSoldOut ? ROATA_CONFIG.segments - 1 : ROATA_CONFIG.segments
  return 1 + Math.floor(Math.random() * max)
}
