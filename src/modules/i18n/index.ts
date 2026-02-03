/**
 * Internationalization (i18n) Module
 *
 * Provides multi-language support for the application.
 * Supported languages: Romanian, English, Hungarian, Polish, Bulgarian, Arabic
 */

export * from './types'
export { useTranslation, I18nProvider, useLocale } from './context'

// Re-export locales for direct access if needed
export { ro } from './locales/ro'
export { en } from './locales/en'
export { hu } from './locales/hu'
export { pl } from './locales/pl'
export { bg } from './locales/bg'
export { ar } from './locales/ar'
