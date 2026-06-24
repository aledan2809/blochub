export interface AllocationWeight {
  id: string
  weight: number
}

/**
 * Split `total` lei into per-id shares rounded to 2 decimals (bani), guaranteeing
 * the shares sum EXACTLY to round(total, 2). Leftover bani are assigned by the
 * largest-remainder (Hamilton) method — largest fractional remainder first, with a
 * deterministic tie-break by id — so a full-set distribution and any subset
 * regeneration produce identical per-apartment shares (G-BLOC-006 / G-BLOC-009a).
 *
 * Notes:
 * - Non-positive weights count as 0 (an apartment with weight 0 gets 0 lei).
 * - If no weight is positive, everyone gets 0.
 * - Stays in `number` (Float) on purpose — this fix is about closing the rounding
 *   residual, NOT the broader Float→Decimal migration (G-BLOC-009b, deferred).
 */
export function allocateByLargestRemainder(
  total: number,
  weights: AllocationWeight[]
): Record<string, number> {
  const result: Record<string, number> = {}
  if (weights.length === 0) return result

  const totalWeight = weights.reduce((s, w) => s + (w.weight > 0 ? w.weight : 0), 0)
  const targetBani = Math.round(total * 100)

  if (totalWeight <= 0) {
    for (const w of weights) result[w.id] = 0
    return result
  }

  const entries = weights.map((w) => {
    const exact = (targetBani * (w.weight > 0 ? w.weight : 0)) / totalWeight
    const floor = Math.floor(exact)
    return { id: w.id, floor, frac: exact - floor }
  })

  // floor never overshoots, so residual is in [0, weights.length)
  let residual = targetBani - entries.reduce((s, e) => s + e.floor, 0)
  const order = [...entries].sort((a, b) => b.frac - a.frac || (a.id < b.id ? -1 : 1))
  for (let i = 0; i < order.length && residual > 0; i++) {
    order[i].floor += 1
    residual--
  }

  for (const e of entries) result[e.id] = e.floor / 100
  return result
}
