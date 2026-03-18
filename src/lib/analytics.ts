// Google Analytics 4 utilities
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

// Cookie consent types
export type CookieConsent = {
  necessary: boolean
  analytics: boolean
  marketing: boolean
  timestamp: number
}

const CONSENT_KEY = 'blochub_cookie_consent'

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(CONSENT_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Invalid stored value
  }
  return null
}

export function setCookieConsent(consent: Omit<CookieConsent, 'timestamp'>): void {
  if (typeof window === 'undefined') return

  const fullConsent: CookieConsent = {
    ...consent,
    timestamp: Date.now(),
  }

  localStorage.setItem(CONSENT_KEY, JSON.stringify(fullConsent))

  // Update Google Analytics consent
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      analytics_storage: consent.analytics ? 'granted' : 'denied',
      ad_storage: consent.marketing ? 'granted' : 'denied',
    })
  }

  // If analytics just got accepted, reload GA
  if (consent.analytics && GA_MEASUREMENT_ID) {
    initGA()
  }
}

export function hasConsentBeenGiven(): boolean {
  return getCookieConsent() !== null
}

export function isAnalyticsAllowed(): boolean {
  const consent = getCookieConsent()
  return consent?.analytics === true
}

// Initialize Google Analytics
export function initGA(): void {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return

  // Check consent before initializing
  const consent = getCookieConsent()
  if (consent && !consent.analytics) return

  // Load gtag script if not already loaded
  if (!window.gtag) {
    const script = document.createElement('script')
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
    script.async = true
    document.head.appendChild(script)

    window.dataLayer = window.dataLayer || []
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer.push(args)
    }

    window.gtag('js', new Date())

    // Set default consent (denied until user accepts)
    if (!consent) {
      window.gtag('consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
      })
    } else {
      window.gtag('consent', 'default', {
        analytics_storage: consent.analytics ? 'granted' : 'denied',
        ad_storage: consent.marketing ? 'granted' : 'denied',
      })
    }

    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: window.location.pathname,
    })
  }
}

// Track page views
export function trackPageView(url: string): void {
  if (!GA_MEASUREMENT_ID || !isAnalyticsAllowed()) return

  if (typeof window.gtag === 'function') {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
    })
  }
}

// Track custom events
export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number
): void {
  if (!GA_MEASUREMENT_ID || !isAnalyticsAllowed()) return

  if (typeof window.gtag === 'function') {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    })
  }
}

// Predefined events for BlocX
export const analytics = {
  // Auth events
  trackSignup: (method: string = 'email') => {
    trackEvent('sign_up', 'auth', method)
  },

  trackLogin: (method: string = 'email') => {
    trackEvent('login', 'auth', method)
  },

  trackLogout: () => {
    trackEvent('logout', 'auth')
  },

  // Pricing page events
  trackPricingView: () => {
    trackEvent('view_item_list', 'pricing', 'pricing_page')
  },

  trackPlanSelect: (planName: string) => {
    trackEvent('select_item', 'pricing', planName)
  },

  trackStartTrial: (planName: string) => {
    trackEvent('begin_checkout', 'pricing', planName)
  },

  // Feature usage events
  trackFeatureUse: (featureName: string) => {
    trackEvent('use_feature', 'features', featureName)
  },

  // Cookie consent
  trackCookieConsent: (accepted: boolean) => {
    // This one tracks without checking consent since it's about consent itself
    if (!GA_MEASUREMENT_ID || typeof window.gtag !== 'function') return
    window.gtag('event', 'cookie_consent', {
      event_category: 'gdpr',
      event_label: accepted ? 'accepted' : 'rejected',
    })
  },
}

// TypeScript declarations for gtag
declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}
