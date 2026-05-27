'use client'

// Clock-style wheel of fortune, segments 1..12 (months). The parent passes a
// `rotation` (cumulative degrees) computed to land the target value under the
// top pointer; the wheel CSS-transitions to it. Value 12 sits at the top (0°),
// then clockwise 1,2,…,11 — like a clock face.

const CX = 160
const CY = 160
const R = 150
const SEG = 12
const STEP = 360 / SEG // 30°

// Point on the circle at angle θ (deg) measured clockwise from the top.
function pt(angleDeg: number, radius = R) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CX + radius * Math.sin(rad), y: CY - radius * Math.cos(rad) }
}

// Clock value shown at each wheel position: top = 12, then 1,2,…,11 clockwise.
const VALUE_AT_INDEX = (i: number) => (i === 0 ? 12 : i)

export function ClockWheel({ rotation, spinning }: { rotation: number; spinning: boolean }) {
  const wedges = Array.from({ length: SEG }, (_, i) => {
    const center = i * STEP // 0,30,…,330
    const a0 = center - STEP / 2
    const a1 = center + STEP / 2
    const p0 = pt(a0)
    const p1 = pt(a1)
    const label = pt(center, R * 0.72)
    const value = VALUE_AT_INDEX(i)
    const fill = i % 2 === 0 ? '#2563eb' : '#1e40af'
    return (
      <g key={i}>
        <path d={`M ${CX} ${CY} L ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${R} ${R} 0 0 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} Z`} fill={fill} stroke="#fff" strokeWidth="1.5" />
        <text x={label.x} y={label.y} fill="#fff" fontSize="22" fontWeight="700" textAnchor="middle" dominantBaseline="central">{value}</text>
      </g>
    )
  })

  return (
    <div className="relative mx-auto" style={{ width: 340, height: 360 }}>
      {/* Pointer */}
      <div
        className="absolute left-1/2 z-10"
        style={{ top: -2, transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '14px solid transparent', borderRight: '14px solid transparent', borderTop: '26px solid #f59e0b' }}
      />
      <svg width={340} height={340} viewBox="0 0 320 320" className="drop-shadow-xl">
        <g
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: '160px 160px',
            transition: spinning ? 'transform 4.2s cubic-bezier(0.17, 0.67, 0.21, 1)' : 'none',
          }}
        >
          {wedges}
        </g>
        <circle cx={CX} cy={CY} r="26" fill="#fff" stroke="#2563eb" strokeWidth="3" />
        <text x={CX} y={CY} fill="#2563eb" fontSize="13" fontWeight="800" textAnchor="middle" dominantBaseline="central">LUNI</text>
      </svg>
    </div>
  )
}

// Compute the next cumulative rotation so that `target` (1..12) ends under the
// top pointer, after `spins` full turns. Always increases (spins forward).
export function rotationForTarget(current: number, target: number, spins = 5): number {
  const desiredMod = (360 - (target % SEG) * STEP) % 360
  const currentMod = ((current % 360) + 360) % 360
  const delta = (desiredMod - currentMod + 360) % 360
  return current + spins * 360 + delta
}
