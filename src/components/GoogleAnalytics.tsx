'use client'

import { Suspense, useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initGA, trackPageView, GA_MEASUREMENT_ID } from '@/lib/analytics'

function GoogleAnalyticsTracker() {
  const [isMounted, setIsMounted] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Ensure we only run on client
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Initialize GA on mount
  useEffect(() => {
    if (isMounted && GA_MEASUREMENT_ID) {
      initGA()
    }
  }, [isMounted])

  // Track page views on route change
  useEffect(() => {
    if (!isMounted || !GA_MEASUREMENT_ID) return

    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
    trackPageView(url)
  }, [isMounted, pathname, searchParams])

  if (!isMounted) return null

  return null
}

export function GoogleAnalytics() {
  return (
    <Suspense fallback={null}>
      <GoogleAnalyticsTracker />
    </Suspense>
  )
}
