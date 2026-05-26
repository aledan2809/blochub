/**
 * Early-adopter offer logic — server-side only.
 *
 * The offer starts at START_MONTHS free months and drops by STEP_PER_WEEK
 * each week down to MIN_MONTHS. Each weekly tier has a limited number of spots.
 *
 * IMPORTANT (per campaign brief): the public surface must expose ONLY the
 * current tier (months + spots remaining) — NEVER the decline schedule.
 * Keep all schedule math in this module; the API returns only the current
 * snapshot.
 *
 * All values are env-overridable so the campaign can be tuned without a code
 * deploy (set env on VPS + pm2 restart):
 *   BLOCHUB_OFFER_START          ISO date the campaign starts (default 2026-06-22)
 *   BLOCHUB_OFFER_START_MONTHS   months at week 0            (default 12)
 *   BLOCHUB_OFFER_MIN_MONTHS     floor                       (default 6)
 *   BLOCHUB_OFFER_STEP_PER_WEEK  months dropped per week     (default 1)
 *   BLOCHUB_OFFER_SPOTS_PER_TIER spots per weekly tier       (default 10)
 */

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? n : fallback
}

export const OFFER_CONFIG = {
  start: process.env.BLOCHUB_OFFER_START || '2026-06-22',
  startMonths: envInt('BLOCHUB_OFFER_START_MONTHS', 12),
  minMonths: envInt('BLOCHUB_OFFER_MIN_MONTHS', 6),
  stepPerWeek: envInt('BLOCHUB_OFFER_STEP_PER_WEEK', 1),
  spotsPerTier: envInt('BLOCHUB_OFFER_SPOTS_PER_TIER', 10),
}

export interface CurrentTier {
  /** Free months offered right now. */
  tierMonths: number
  /** 0-based week index since the campaign start (clamped to >= 0). */
  weekIndex: number
  /** Total spots allotted to the current tier. */
  spotsTotal: number
}

/** Compute the current tier from the campaign start date. Schedule stays here. */
export function getCurrentTier(now: Date = new Date()): CurrentTier {
  const start = new Date(OFFER_CONFIG.start).getTime()
  const elapsed = now.getTime() - start
  const weekIndex = elapsed <= 0 ? 0 : Math.floor(elapsed / MS_PER_WEEK)
  const tierMonths = Math.max(
    OFFER_CONFIG.minMonths,
    OFFER_CONFIG.startMonths - weekIndex * OFFER_CONFIG.stepPerWeek
  )
  return { tierMonths, weekIndex, spotsTotal: OFFER_CONFIG.spotsPerTier }
}
