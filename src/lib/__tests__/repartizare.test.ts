import { allocateByLargestRemainder, AllocationWeight } from '../repartizare'

const sum = (r: Record<string, number>) =>
  Math.round(Object.values(r).reduce((s, v) => s + v, 0) * 100) / 100

describe('allocateByLargestRemainder', () => {
  it('closes the classic 100 / 3 penny-leak (sums to exactly 100.00)', () => {
    const r = allocateByLargestRemainder(100, [
      { id: 'a', weight: 1 },
      { id: 'b', weight: 1 },
      { id: 'c', weight: 1 },
    ])
    expect(sum(r)).toBe(100)
    // leftover ban goes to the deterministic first id
    expect(r.a).toBe(33.34)
    expect(r.b).toBe(33.33)
    expect(r.c).toBe(33.33)
  })

  it('handles a small total (0.10 / 3) without losing bani', () => {
    const r = allocateByLargestRemainder(0.1, [
      { id: 'a', weight: 1 },
      { id: 'b', weight: 1 },
      { id: 'c', weight: 1 },
    ])
    expect(sum(r)).toBe(0.1)
    expect(r.a).toBe(0.04)
    expect(r.b).toBe(0.03)
    expect(r.c).toBe(0.03)
  })

  it('respects weighted cotă-indiviză shares and still sums exactly', () => {
    const r = allocateByLargestRemainder(100, [
      { id: 'a', weight: 33.33 },
      { id: 'b', weight: 33.33 },
      { id: 'c', weight: 33.34 },
    ])
    expect(sum(r)).toBe(100)
    // c has the largest weight, so it is not short-changed
    expect(r.c).toBeGreaterThanOrEqual(r.a)
  })

  it('gives the full total to a single apartment', () => {
    expect(allocateByLargestRemainder(57.77, [{ id: 'only', weight: 5 }])).toEqual({
      only: 57.77,
    })
  })

  it('treats zero / negative weights as 0 and never bills them', () => {
    const r = allocateByLargestRemainder(100, [
      { id: 'a', weight: 0 },
      { id: 'b', weight: -3 },
      { id: 'c', weight: 10 },
    ])
    expect(r.a).toBe(0)
    expect(r.b).toBe(0)
    expect(r.c).toBe(100)
    expect(sum(r)).toBe(100)
  })

  it('returns all-zero when no weight is positive', () => {
    const r = allocateByLargestRemainder(100, [
      { id: 'a', weight: 0 },
      { id: 'b', weight: 0 },
    ])
    expect(r).toEqual({ a: 0, b: 0 })
  })

  it('returns {} for an empty apartment set', () => {
    expect(allocateByLargestRemainder(100, [])).toEqual({})
  })

  it('property: shares always sum to round(total, 2) for many random inputs', () => {
    const rand = (seed: number) => {
      // deterministic LCG so the test is stable (no Math.random flake)
      let s = seed
      return () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff
        return s / 0x7fffffff
      }
    }
    const next = rand(42)
    for (let t = 0; t < 500; t++) {
      const n = 1 + Math.floor(next() * 12)
      const total = Math.round(next() * 1_000_000) / 100 // up to 10000.00 lei
      const weights: AllocationWeight[] = Array.from({ length: n }, (_, i) => ({
        id: `apt-${i}`,
        weight: Math.round(next() * 10000) / 100,
      }))
      const r = allocateByLargestRemainder(total, weights)
      expect(sum(r)).toBe(Math.round(total * 100) / 100)
    }
  })

  it('is deterministic: identical inputs yield identical output (subset-regen safety)', () => {
    const weights: AllocationWeight[] = [
      { id: 'z', weight: 1 },
      { id: 'a', weight: 1 },
      { id: 'm', weight: 1 },
    ]
    const r1 = allocateByLargestRemainder(10, weights)
    const r2 = allocateByLargestRemainder(10, [...weights].reverse())
    expect(r1).toEqual(r2)
  })
})
