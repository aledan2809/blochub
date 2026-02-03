'use client'

/**
 * i18n React Context and Hooks
 *
 * Provides translation functionality throughout the application.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { Locale, TranslationKeys, LocaleInfo } from './types'
import { DEFAULT_LOCALE, LOCALES, RTL_LOCALES } from './types'

// Import all translations
import { ro } from './locales/ro'
import { en } from './locales/en'
import { hu } from './locales/hu'
import { pl } from './locales/pl'
import { bg } from './locales/bg'
import { ar } from './locales/ar'

// All translations map
const translations: Record<Locale, TranslationKeys> = {
  ro,
  en,
  hu,
  pl,
  bg,
  ar,
}

// Context type
interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
  localeInfo: LocaleInfo
  isRTL: boolean
  availableLocales: LocaleInfo[]
}

// Create context
const I18nContext = createContext<I18nContextType | null>(null)

// Local storage key
const LOCALE_STORAGE_KEY = 'blochub_locale'

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): string | undefined {
  const keys = path.split('.')
  let current = obj

  for (const key of keys) {
    if (current === undefined || current === null) {
      return undefined
    }
    current = current[key]
  }

  return typeof current === 'string' ? current : undefined
}

/**
 * Replace parameters in translation string
 * Supports {{param}} syntax
 */
function replaceParams(str: string, params?: Record<string, string | number>): string {
  if (!params) return str

  let result = str
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value))
  }
  return result
}

/**
 * I18n Provider Component
 */
export function I18nProvider({ children, initialLocale }: { children: ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale || DEFAULT_LOCALE)
  const [mounted, setMounted] = useState(false)

  // Load saved locale on mount
  useEffect(() => {
    const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null
    if (savedLocale && LOCALES[savedLocale]) {
      setLocaleState(savedLocale)
    }
    setMounted(true)
  }, [])

  // Update document direction for RTL languages
  useEffect(() => {
    if (mounted) {
      const isRTL = RTL_LOCALES.includes(locale)
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
      document.documentElement.lang = locale
    }
  }, [locale, mounted])

  // Set locale and save to storage
  const setLocale = useCallback((newLocale: Locale) => {
    if (LOCALES[newLocale]) {
      setLocaleState(newLocale)
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale)
    }
  }, [])

  // Translation function
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const translation = getNestedValue(translations[locale], key)

      if (translation === undefined) {
        // Fallback to default locale
        const fallback = getNestedValue(translations[DEFAULT_LOCALE], key)
        if (fallback) {
          return replaceParams(fallback, params)
        }
        // Return key if translation not found
        console.warn(`Translation missing for key: ${key}`)
        return key
      }

      return replaceParams(translation, params)
    },
    [locale]
  )

  // Context value
  const value: I18nContextType = {
    locale,
    setLocale,
    t,
    localeInfo: LOCALES[locale],
    isRTL: RTL_LOCALES.includes(locale),
    availableLocales: Object.values(LOCALES),
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/**
 * Hook to access translation function
 */
export function useTranslation() {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider')
  }

  return {
    t: context.t,
    locale: context.locale,
    isRTL: context.isRTL,
  }
}

/**
 * Hook to access and change locale
 */
export function useLocale() {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error('useLocale must be used within an I18nProvider')
  }

  return {
    locale: context.locale,
    setLocale: context.setLocale,
    localeInfo: context.localeInfo,
    availableLocales: context.availableLocales,
    isRTL: context.isRTL,
  }
}
