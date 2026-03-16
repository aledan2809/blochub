'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, Cookie, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getCookieConsent,
  setCookieConsent,
  hasConsentBeenGiven,
  analytics,
} from '@/lib/analytics'

type ConsentState = {
  necessary: boolean
  analytics: boolean
  marketing: boolean
}

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [consent, setConsent] = useState<ConsentState>({
    necessary: true, // Always required
    analytics: false,
    marketing: false,
  })

  useEffect(() => {
    // Check if consent was already given
    const existingConsent = getCookieConsent()
    if (!existingConsent) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 1000)
      return () => clearTimeout(timer)
    } else {
      setConsent({
        necessary: true,
        analytics: existingConsent.analytics,
        marketing: existingConsent.marketing,
      })
    }
  }, [])

  const saveConsentToServer = async (consentData: ConsentState) => {
    try {
      await fetch('/api/user/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consents: [
            { type: 'COOKIE_NECESSARY', granted: consentData.necessary },
            { type: 'COOKIE_ANALYTICS', granted: consentData.analytics },
            { type: 'COOKIE_MARKETING', granted: consentData.marketing },
          ],
          version: '1.0',
        }),
      })
    } catch (error) {
      // Silently fail - localStorage is the primary storage
      console.error('Failed to save consent to server:', error)
    }
  }

  const handleAcceptAll = () => {
    const fullConsent = {
      necessary: true,
      analytics: true,
      marketing: true,
    }
    setCookieConsent(fullConsent)
    setConsent(fullConsent)
    setIsVisible(false)
    analytics.trackCookieConsent(true)
    saveConsentToServer(fullConsent)
  }

  const handleAcceptNecessary = () => {
    const minimalConsent = {
      necessary: true,
      analytics: false,
      marketing: false,
    }
    setCookieConsent(minimalConsent)
    setConsent(minimalConsent)
    setIsVisible(false)
    analytics.trackCookieConsent(false)
    saveConsentToServer(minimalConsent)
  }

  const handleSavePreferences = () => {
    setCookieConsent(consent)
    setIsVisible(false)
    setShowSettings(false)
    analytics.trackCookieConsent(consent.analytics || consent.marketing)
    saveConsentToServer(consent)
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t shadow-lg md:p-6">
      <div className="max-w-6xl mx-auto">
        {!showSettings ? (
          // Main banner
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <Cookie className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-700">
                  Folosim cookie-uri pentru a-ți oferi cea mai bună experiență pe site-ul nostru.
                  Cookie-urile necesare sunt esențiale pentru funcționarea site-ului.
                  Cookie-urile de analytics ne ajută să îmbunătățim serviciul.
                </p>
                <Link
                  href="/privacy"
                  className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                >
                  Află mai multe despre politica noastră de confidențialitate
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 md:flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Setări
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAcceptNecessary}
              >
                Doar necesare
              </Button>
              <Button size="sm" onClick={handleAcceptAll}>
                Acceptă toate
              </Button>
            </div>
          </div>
        ) : (
          // Settings panel
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Setări cookie-uri</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Necessary cookies */}
              <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">Cookie-uri necesare</div>
                  <p className="text-sm text-gray-600">
                    Esențiale pentru funcționarea site-ului. Nu pot fi dezactivate.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="h-5 w-5 rounded border-gray-300"
                />
              </div>

              {/* Analytics cookies */}
              <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">Cookie-uri de analytics</div>
                  <p className="text-sm text-gray-600">
                    Ne ajută să înțelegem cum folosești site-ul pentru a-l îmbunătăți (Google Analytics).
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={consent.analytics}
                  onChange={(e) =>
                    setConsent((prev) => ({ ...prev, analytics: e.target.checked }))
                  }
                  className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>

              {/* Marketing cookies */}
              <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">Cookie-uri de marketing</div>
                  <p className="text-sm text-gray-600">
                    Folosite pentru a-ți arăta reclame relevante pe alte site-uri.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={consent.marketing}
                  onChange={(e) =>
                    setConsent((prev) => ({ ...prev, marketing: e.target.checked }))
                  }
                  className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleAcceptNecessary}>
                Respinge toate
              </Button>
              <Button size="sm" onClick={handleSavePreferences}>
                Salvează preferințele
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
