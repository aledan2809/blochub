'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { initGA, trackPageView, GA_MEASUREMENT_ID } from '@/lib/analytics'

export function GoogleAnalytics() {
  const pathname = usePathname()

  // Initialize GA on mount
  useEffect(() => {
    if (GA_MEASUREMENT_ID) {
      initGA()
    }
  }, [])

  // Track page views on route change
  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return

    trackPageView(pathname)
  }, [pathname])

  return null
}
