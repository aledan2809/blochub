/**
 * Internationalization (i18n) Types
 *
 * This module provides type definitions for multi-language support.
 * Supported languages (Phase 1):
 * - Romanian (ro) - Default
 * - English (en)
 * - Hungarian (hu)
 * - Polish (pl)
 * - Bulgarian (bg)
 * - Arabic (ar)
 */

// Supported locales
export type Locale = 'ro' | 'en' | 'hu' | 'pl' | 'bg' | 'ar'

// Default locale
export const DEFAULT_LOCALE: Locale = 'ro'

// RTL languages
export const RTL_LOCALES: Locale[] = ['ar']

// Locale metadata
export interface LocaleInfo {
  code: Locale
  name: string        // English name
  nativeName: string  // Name in the language itself
  flag: string        // Emoji flag
  direction: 'ltr' | 'rtl'
}

export const LOCALES: Record<Locale, LocaleInfo> = {
  ro: {
    code: 'ro',
    name: 'Romanian',
    nativeName: 'Română',
    flag: '🇷🇴',
    direction: 'ltr',
  },
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    direction: 'ltr',
  },
  hu: {
    code: 'hu',
    name: 'Hungarian',
    nativeName: 'Magyar',
    flag: '🇭🇺',
    direction: 'ltr',
  },
  pl: {
    code: 'pl',
    name: 'Polish',
    nativeName: 'Polski',
    flag: '🇵🇱',
    direction: 'ltr',
  },
  bg: {
    code: 'bg',
    name: 'Bulgarian',
    nativeName: 'Български',
    flag: '🇧🇬',
    direction: 'ltr',
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇦🇪',
    direction: 'rtl',
  },
}

// Translation keys structure
// This defines all translatable strings in the application
export interface TranslationKeys {
  // Common
  common: {
    save: string
    cancel: string
    delete: string
    edit: string
    add: string
    search: string
    filter: string
    loading: string
    error: string
    success: string
    confirm: string
    yes: string
    no: string
    back: string
    next: string
    previous: string
    close: string
    refresh: string
    export: string
    import: string
    download: string
    upload: string
    view: string
    actions: string
    status: string
    date: string
    amount: string
    total: string
    details: string
    notes: string
    required: string
    optional: string
  }

  // Navigation
  nav: {
    dashboard: string
    apartments: string
    owners: string
    expenses: string
    receipts: string
    payments: string
    reports: string
    documents: string
    announcements: string
    tickets: string
    settings: string
    chat: string
    logout: string
  }

  // Dashboard
  dashboard: {
    welcome: string
    totalApartments: string
    totalOwners: string
    monthlyExpenses: string
    pendingPayments: string
    recentActivity: string
    quickActions: string
  }

  // Settings
  settings: {
    title: string
    profile: string
    association: string
    bankAccounts: string
    fiscal: string
    notifications: string
    data: string
    account: string
    language: string
    selectLanguage: string
  }

  // Fiscal / SPV
  fiscal: {
    title: string
    spvIntegration: string
    connectToAnaf: string
    disconnect: string
    connected: string
    notConnected: string
    lastSync: string
    syncNow: string
    syncing: string
    invoices: string
    newInvoices: string
    processedInvoices: string
    howItWorks: string
    step1: string
    step2: string
    step3: string
    step4: string
    certificateNote: string
    autoSync: string
    autoSyncDescription: string
  }

  // Authentication
  auth: {
    login: string
    register: string
    logout: string
    email: string
    password: string
    confirmPassword: string
    forgotPassword: string
    resetPassword: string
    rememberMe: string
    noAccount: string
    hasAccount: string
    createAccount: string
  }

  // Validation messages
  validation: {
    required: string
    invalidEmail: string
    passwordTooShort: string
    passwordsDoNotMatch: string
    invalidPhone: string
  }

  // Error messages
  errors: {
    generic: string
    notFound: string
    unauthorized: string
    forbidden: string
    serverError: string
    networkError: string
    validationError: string
  }

  // Success messages
  success: {
    saved: string
    deleted: string
    updated: string
    created: string
    sent: string
    synced: string
  }
}

// Type for translation function
export type TranslateFunction = (key: string, params?: Record<string, string | number>) => string
