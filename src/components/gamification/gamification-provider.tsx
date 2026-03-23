'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import type { GamificationResult } from '@/lib/gamification/engine'

interface GamificationContextType {
  data: GamificationResult | null
  loading: boolean
  refresh: () => void
}

const GamificationContext = createContext<GamificationContextType>({
  data: null,
  loading: false,
  refresh: () => {},
})

export function GamificationProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const [data, setData] = useState<GamificationResult | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    if (!session?.user) return
    setLoading(true)
    try {
      const res = await fetch('/api/gamification')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch {
      // gamification is non-critical
    } finally {
      setLoading(false)
    }
  }, [session?.user])

  useEffect(() => {
    if (!session?.user) return
    fetchData()
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [session?.user, fetchData])

  return (
    <GamificationContext.Provider value={{ data, loading, refresh: fetchData }}>
      {children}
    </GamificationContext.Provider>
  )
}

export function useGamification() {
  return useContext(GamificationContext)
}
