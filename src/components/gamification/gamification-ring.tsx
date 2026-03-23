'use client'

import Link from 'next/link'
import { Trophy } from 'lucide-react'
import { useGamification } from './gamification-provider'

const RADIUS = 26
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function GamificationRing() {
  const { data } = useGamification()

  if (!data) return null

  const color = data.levelColor ?? '#9ca3af'
  const progress = Math.min(Math.max(data.levelProgress, 0), 100)
  const dashOffset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE

  return (
    <Link
      href="/dashboard/gamification"
      className="flex items-center gap-2.5 h-10 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors"
      title={`${data.level} — ${data.totalScore}/${data.maxScore} XP`}
    >
      {/* SVG Ring */}
      <div className="relative flex-shrink-0">
        <svg width="32" height="32" viewBox="0 0 60 60" className="-rotate-90">
          <circle
            cx="30" cy="30" r={RADIUS}
            fill="none" stroke="#e5e7eb" strokeWidth="4"
          />
          <circle
            cx="30" cy="30" r={RADIUS}
            fill="none" stroke={color} strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Trophy className="w-3 h-3" style={{ color }} />
        </div>
      </div>

      {/* Text */}
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-bold leading-none" style={{ color }}>
          {data.level}
        </span>
        <span className="text-[10px] text-gray-400 leading-none mt-0.5">
          {data.totalScore} XP
        </span>
      </div>
    </Link>
  )
}
