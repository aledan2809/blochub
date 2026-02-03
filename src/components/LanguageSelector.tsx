'use client'

/**
 * Language Selector Component
 *
 * Allows users to switch between supported languages.
 * Can be used in settings or as a dropdown in the header.
 */

import { useLocale } from '@/modules/i18n'
import { cn } from '@/lib/utils'
import { Globe, Check } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface LanguageSelectorProps {
  variant?: 'dropdown' | 'list'
  className?: string
}

export function LanguageSelector({ variant = 'dropdown', className }: LanguageSelectorProps) {
  const { locale, setLocale, localeInfo, availableLocales } = useLocale()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (variant === 'list') {
    return (
      <div className={cn('space-y-2', className)}>
        {availableLocales.map((loc) => (
          <button
            key={loc.code}
            onClick={() => setLocale(loc.code)}
            className={cn(
              'w-full flex items-center justify-between p-3 rounded-lg border transition-colors',
              locale === loc.code
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{loc.flag}</span>
              <div className="text-left">
                <p className="font-medium">{loc.nativeName}</p>
                <p className="text-xs text-gray-500">{loc.name}</p>
              </div>
            </div>
            {locale === loc.code && <Check className="h-5 w-5 text-blue-600" />}
          </button>
        ))}
      </div>
    )
  }

  // Dropdown variant
  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        <Globe className="h-4 w-4 text-gray-500" />
        <span className="text-lg">{localeInfo.flag}</span>
        <span className="text-sm font-medium">{localeInfo.code.toUpperCase()}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {availableLocales.map((loc) => (
            <button
              key={loc.code}
              onClick={() => {
                setLocale(loc.code)
                setIsOpen(false)
              }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors',
                locale === loc.code && 'bg-blue-50 text-blue-700'
              )}
            >
              <span className="text-lg">{loc.flag}</span>
              <div className="flex-1">
                <p className="text-sm font-medium">{loc.nativeName}</p>
              </div>
              {locale === loc.code && <Check className="h-4 w-4 text-blue-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
