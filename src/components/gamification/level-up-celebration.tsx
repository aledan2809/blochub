'use client'

import { useEffect, useState } from 'react'
import { useGamification } from './gamification-provider'

const LEVEL_ORDER = ['Incepator', 'Activ', 'Avansat', 'Expert', 'Master'] as const
type Level = (typeof LEVEL_ORDER)[number]

const LEVEL_COLORS: Record<Level, string> = {
  Incepator: 'text-amber-500',
  Activ: 'text-gray-400',
  Avansat: 'text-yellow-400',
  Expert: 'text-cyan-400',
  Master: 'text-blue-400',
}

const LEVEL_MESSAGES: Record<Level, string> = {
  Incepator: 'Bine ai venit! Călătoria ta începe.',
  Activ: 'Progresezi frumos! Continuă așa!',
  Avansat: 'Performanță excelentă! Ești printre cei mai buni administratori.',
  Expert: 'Impresionant! Stăpânești administrarea blocului.',
  Master: 'Statut de elită! Ești un maestru al administrării!',
}

const STORAGE_KEY = 'blocx_level'

export function LevelUpCelebration() {
  const { data } = useGamification()
  const [show, setShow] = useState(false)
  const [oldLevel, setOldLevel] = useState<Level | null>(null)
  const [newLevel, setNewLevel] = useState<Level | null>(null)

  useEffect(() => {
    if (!data?.level) return

    const current = data.level as Level
    const stored = (typeof window !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY)
      : null) as Level | null

    const currentIdx = LEVEL_ORDER.indexOf(current)
    const storedIdx = stored ? LEVEL_ORDER.indexOf(stored) : -1

    if (currentIdx > storedIdx) {
      setOldLevel(stored ?? ('Incepator' as Level))
      setNewLevel(current)
      setShow(true)

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, current)
      }

      const timer = setTimeout(() => setShow(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [data?.level])

  if (!show || !newLevel) return null

  const message = LEVEL_MESSAGES[newLevel]
  const oldColor = oldLevel ? LEVEL_COLORS[oldLevel] : 'text-amber-500'
  const newColor = LEVEL_COLORS[newLevel]

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={() => setShow(false)}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="flex flex-col items-center gap-4 p-10 text-center max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-8xl animate-bounce select-none">🏆</span>
        <h2 className="text-4xl font-black text-white tracking-tight">Nivel nou!</h2>

        <div className="flex items-center gap-3 text-lg font-bold">
          {oldLevel && oldLevel !== newLevel && (
            <>
              <span className={oldColor}>{oldLevel}</span>
              <span className="text-gray-500">→</span>
            </>
          )}
          <span className={`${newColor} text-2xl font-black`}>{newLevel}</span>
        </div>

        <p className="text-gray-300 text-sm leading-relaxed">{message}</p>
        <p className="text-gray-600 text-xs mt-2">Click oriunde pentru a închide</p>
      </div>
    </div>
  )
}
