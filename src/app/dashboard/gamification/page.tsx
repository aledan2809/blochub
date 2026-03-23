'use client'

import { useGamification } from '@/components/gamification/gamification-provider'
import { Trophy, Star, Lock, Loader2 } from 'lucide-react'

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  setup: { label: 'Configurare', icon: '⚙️' },
  administrare: { label: 'Administrare', icon: '🏢' },
  financiar: { label: 'Financiar', icon: '💰' },
  comunitate: { label: 'Comunitate', icon: '👥' },
  avansat: { label: 'Funcții avansate', icon: '🤖' },
}

const RADIUS = 60
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function GamificationPage() {
  const { data, loading } = useGamification()

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const earnedCount = data.achievements.filter((a) => a.earned).length
  const totalCount = data.achievements.length
  const progress = Math.min(Math.max(data.levelProgress, 0), 100)
  const dashOffset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE

  // Group achievements by category
  const categories = Object.entries(
    data.achievements.reduce<Record<string, typeof data.achievements>>((acc, a) => {
      const cat = a.category || 'setup'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(a)
      return acc
    }, {})
  )

  return (
    <div className="space-y-8">
      {/* Header with level ring */}
      <div className="bg-white rounded-2xl border p-6 flex flex-col sm:flex-row items-center gap-6">
        {/* Level ring */}
        <div className="relative flex-shrink-0">
          <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
            <circle cx="70" cy="70" r={RADIUS} fill="none" stroke="#e5e7eb" strokeWidth="8" />
            <circle
              cx="70" cy="70" r={RADIUS}
              fill="none" stroke={data.levelColor} strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl">{data.levelIcon}</span>
            <span className="text-xs font-bold mt-1" style={{ color: data.levelColor }}>
              {data.level}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-bold text-gray-900">Nivelul tău</h1>
          <p className="text-gray-500 text-sm mt-1">
            {data.totalScore} / {data.maxScore} XP
          </p>
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{earnedCount}</p>
              <p className="text-xs text-gray-500">Realizări</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{data.setupProgress}%</p>
              <p className="text-xs text-gray-500">Setup</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{data.pillars.length}</p>
              <p className="text-xs text-gray-500">Piloni</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pillars */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Piloni de progres</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {data.pillars.map((pillar) => {
            const pct = Math.round((pillar.score / pillar.maxScore) * 100)
            return (
              <div key={pillar.id} className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{pillar.icon}</span>
                  <span className="text-sm font-semibold text-gray-900">{pillar.name}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {pillar.score} / {pillar.maxScore} puncte
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Achievements by category */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Realizări ({earnedCount}/{totalCount})
        </h2>
        <div className="space-y-6">
          {categories.map(([cat, achievements]) => {
            const catInfo = CATEGORY_LABELS[cat] || { label: cat, icon: '📌' }
            return (
              <div key={cat}>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span>{catInfo.icon}</span>
                  {catInfo.label}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {achievements.map((a) => (
                    <div
                      key={a.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                        a.earned
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200 opacity-60'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${
                        a.earned ? 'bg-green-100' : 'bg-gray-200'
                      }`}>
                        {a.earned ? a.icon : <Lock className="w-4 h-4 text-gray-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${a.earned ? 'text-gray-900' : 'text-gray-500'}`}>
                          {a.title}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{a.description}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        a.earned ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {a.earned ? <Star className="w-3 h-3 inline" /> : `+${a.xp}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tips */}
      {data.tips.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Sfaturi pentru a avansa
          </h3>
          <ul className="space-y-1">
            {data.tips.map((tip, i) => (
              <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
