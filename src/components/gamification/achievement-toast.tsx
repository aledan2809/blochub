'use client'

import { useEffect, useRef, useState } from 'react'
import { Trophy, X } from 'lucide-react'
import { useGamification } from './gamification-provider'

interface ToastItem {
  id: string
  title: string
  icon: string
  xp: number
}

export function AchievementToast() {
  const { data } = useGamification()
  const [queue, setQueue] = useState<ToastItem[]>([])
  const [current, setCurrent] = useState<ToastItem | null>(null)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const processedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!data?.newAchievements?.length) return

    const toAdd: ToastItem[] = []
    for (const id of data.newAchievements) {
      const storageKey = `blocx_achievement_${id}`
      if (processedRef.current.has(id)) continue
      if (typeof window !== 'undefined' && localStorage.getItem(storageKey)) continue

      const achievement = data.achievements.find((a) => a.id === id)
      if (!achievement) continue

      toAdd.push({
        id,
        title: achievement.title,
        icon: achievement.icon,
        xp: achievement.xp,
      })
      processedRef.current.add(id)
    }

    if (toAdd.length > 0) {
      setQueue((prev) => [...prev, ...toAdd])
    }
  }, [data?.newAchievements, data?.achievements])

  useEffect(() => {
    if (current || queue.length === 0) return

    const next = queue[0]
    setQueue((prev) => prev.slice(1))
    setCurrent(next)

    requestAnimationFrame(() => setVisible(true))
    timerRef.current = setTimeout(() => dismiss(next.id), 5000)
  }, [queue, current])

  function dismiss(id: string) {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
    if (typeof window !== 'undefined') {
      localStorage.setItem(`blocx_achievement_${id}`, '1')
    }
    setTimeout(() => setCurrent(null), 500)
  }

  if (!current) return null

  return (
    <div
      className={[
        'fixed bottom-6 right-6 z-[100]',
        'flex items-start gap-4 p-4',
        'bg-gradient-to-br from-amber-50 to-yellow-50',
        'border border-yellow-300 rounded-2xl shadow-xl',
        'min-w-[280px] max-w-xs',
        'transition-all duration-500',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0',
      ].join(' ')}
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-yellow-100 border border-yellow-300 flex items-center justify-center text-2xl">
        {current.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Trophy className="w-3 h-3 text-yellow-600" />
          <span className="text-xs font-bold text-yellow-700 uppercase tracking-wide">
            Realizare deblocată!
          </span>
        </div>
        <p className="text-sm font-semibold text-gray-900 truncate">{current.title}</p>
        <p className="text-xs text-amber-600 font-medium mt-0.5">+{current.xp} XP</p>
      </div>

      <button
        onClick={() => dismiss(current.id)}
        className="flex-shrink-0 p-1 rounded-lg text-yellow-500 hover:text-yellow-700 hover:bg-yellow-100 transition-colors"
        aria-label="Închide"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
