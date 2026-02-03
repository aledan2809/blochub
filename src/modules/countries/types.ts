/**
 * Country Modules - Type Definitions
 *
 * This file defines the interfaces for country-specific modules.
 * Each country can implement its own fiscal integrations, regulatory requirements,
 * and localized features.
 */

// Supported countries
export type CountryCode = 'RO' | 'PL' | 'HU' | 'BG' | 'AE' | 'GB' | 'US'

// Country configuration
export interface CountryConfig {
  code: CountryCode
  name: string
  nativeName: string
  currency: string
  currencySymbol: string
  dateFormat: string
  numberFormat: {
    decimal: string
    thousands: string
  }
  timezone: string
  fiscalYearStart: number // Month (1-12)
  features: CountryFeatures
}

// Features available per country
export interface CountryFeatures {
  // Fiscal integrations
  fiscalInvoicing: boolean        // e-Factura (RO), KSeF (PL), etc.
  fiscalInvoicingName?: string    // Display name of the system

  // Property/Building specific
  buildingManagementLaw: boolean  // Has specific HOA/building law
  utilityMetering: boolean        // Standard utility metering
  heatAllocation: boolean         // Heat cost allocation required

  // Payment
  bankingIntegration: boolean     // Local banking integration
  onlinePayments: boolean         // Online payment support

  // Compliance
  gdprCompliance: boolean         // EU GDPR
  localDataResidency: boolean     // Data must stay in country
}

/**
 * Fiscal Integration Module Interface
 *
 * Each country's fiscal system (e-Factura, KSeF, etc.) should implement this interface
 */
export interface FiscalIntegrationModule {
  // Module info
  readonly countryCode: CountryCode
  readonly systemName: string
  readonly systemUrl: string

  // Configuration
  isConfigured(): boolean
  getAuthorizationUrl(state: string): string

  // OAuth flow
  handleOAuthCallback(code: string, state: string): Promise<FiscalOAuthResult>
  refreshToken(asociatieId: string): Promise<boolean>
  disconnect(asociatieId: string): Promise<void>

  // Invoice operations
  syncInvoices(asociatieId: string): Promise<FiscalSyncResult>
  getInvoices(asociatieId: string, filters?: FiscalInvoiceFilters): Promise<FiscalInvoice[]>
  downloadInvoice(asociatieId: string, invoiceId: string): Promise<FiscalInvoiceDownload>
}

// Fiscal OAuth result
export interface FiscalOAuthResult {
  success: boolean
  error?: string
  expiresAt?: Date
}

// Fiscal sync result
export interface FiscalSyncResult {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
  syncedAt: Date
}

// Fiscal invoice filters
export interface FiscalInvoiceFilters {
  status?: 'new' | 'processed' | 'ignored' | 'error'
  fromDate?: Date
  toDate?: Date
  supplierId?: string
}

// Fiscal invoice
export interface FiscalInvoice {
  id: string
  systemId: string           // ID in the fiscal system
  supplierTaxId: string
  supplierName: string
  invoiceNumber: string
  issueDate: Date
  dueDate?: Date
  totalAmount: number
  taxAmount?: number
  currency: string
  status: 'new' | 'processed' | 'ignored' | 'error'
  rawData?: string
}

// Invoice download result
export interface FiscalInvoiceDownload {
  success: boolean
  xml?: string
  pdf?: Buffer
  error?: string
}

/**
 * Country Module Registry
 *
 * Manages available country modules and their features
 */
export interface CountryModuleRegistry {
  getCountry(code: CountryCode): CountryConfig | null
  getAllCountries(): CountryConfig[]
  getFiscalModule(code: CountryCode): FiscalIntegrationModule | null
  hasFiscalIntegration(code: CountryCode): boolean
}

/**
 * Default country configurations
 */
export const COUNTRY_CONFIGS: Record<CountryCode, CountryConfig> = {
  RO: {
    code: 'RO',
    name: 'Romania',
    nativeName: 'România',
    currency: 'RON',
    currencySymbol: 'lei',
    dateFormat: 'DD.MM.YYYY',
    numberFormat: { decimal: ',', thousands: '.' },
    timezone: 'Europe/Bucharest',
    fiscalYearStart: 1,
    features: {
      fiscalInvoicing: true,
      fiscalInvoicingName: 'SPV / e-Factura (ANAF)',
      buildingManagementLaw: true,
      utilityMetering: true,
      heatAllocation: true,
      bankingIntegration: true,
      onlinePayments: true,
      gdprCompliance: true,
      localDataResidency: false,
    },
  },
  PL: {
    code: 'PL',
    name: 'Poland',
    nativeName: 'Polska',
    currency: 'PLN',
    currencySymbol: 'zł',
    dateFormat: 'DD.MM.YYYY',
    numberFormat: { decimal: ',', thousands: ' ' },
    timezone: 'Europe/Warsaw',
    fiscalYearStart: 1,
    features: {
      fiscalInvoicing: true,
      fiscalInvoicingName: 'KSeF (Krajowy System e-Faktur)',
      buildingManagementLaw: true,
      utilityMetering: true,
      heatAllocation: true,
      bankingIntegration: true,
      onlinePayments: true,
      gdprCompliance: true,
      localDataResidency: false,
    },
  },
  HU: {
    code: 'HU',
    name: 'Hungary',
    nativeName: 'Magyarország',
    currency: 'HUF',
    currencySymbol: 'Ft',
    dateFormat: 'YYYY.MM.DD',
    numberFormat: { decimal: ',', thousands: ' ' },
    timezone: 'Europe/Budapest',
    fiscalYearStart: 1,
    features: {
      fiscalInvoicing: true,
      fiscalInvoicingName: 'NAV Online Számla',
      buildingManagementLaw: true,
      utilityMetering: true,
      heatAllocation: true,
      bankingIntegration: true,
      onlinePayments: true,
      gdprCompliance: true,
      localDataResidency: false,
    },
  },
  BG: {
    code: 'BG',
    name: 'Bulgaria',
    nativeName: 'България',
    currency: 'BGN',
    currencySymbol: 'лв',
    dateFormat: 'DD.MM.YYYY',
    numberFormat: { decimal: ',', thousands: ' ' },
    timezone: 'Europe/Sofia',
    fiscalYearStart: 1,
    features: {
      fiscalInvoicing: false, // Bulgaria doesn't have mandatory e-invoicing yet
      buildingManagementLaw: true,
      utilityMetering: true,
      heatAllocation: true,
      bankingIntegration: true,
      onlinePayments: true,
      gdprCompliance: true,
      localDataResidency: false,
    },
  },
  AE: {
    code: 'AE',
    name: 'United Arab Emirates',
    nativeName: 'الإمارات العربية المتحدة',
    currency: 'AED',
    currencySymbol: 'د.إ',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: { decimal: '.', thousands: ',' },
    timezone: 'Asia/Dubai',
    fiscalYearStart: 1,
    features: {
      fiscalInvoicing: false, // UAE has VAT but no e-invoicing mandate yet
      buildingManagementLaw: true,
      utilityMetering: true,
      heatAllocation: false,
      bankingIntegration: true,
      onlinePayments: true,
      gdprCompliance: false,
      localDataResidency: true, // UAE data residency requirements
    },
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    nativeName: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '£',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: { decimal: '.', thousands: ',' },
    timezone: 'Europe/London',
    fiscalYearStart: 4, // UK tax year starts in April
    features: {
      fiscalInvoicing: false, // MTD (Making Tax Digital) is different
      buildingManagementLaw: true,
      utilityMetering: true,
      heatAllocation: true,
      bankingIntegration: true,
      onlinePayments: true,
      gdprCompliance: true, // UK GDPR
      localDataResidency: false,
    },
  },
  US: {
    code: 'US',
    name: 'United States',
    nativeName: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    dateFormat: 'MM/DD/YYYY',
    numberFormat: { decimal: '.', thousands: ',' },
    timezone: 'America/New_York',
    fiscalYearStart: 1,
    features: {
      fiscalInvoicing: false, // No federal e-invoicing mandate
      buildingManagementLaw: true, // Varies by state (HOA laws)
      utilityMetering: true,
      heatAllocation: false,
      bankingIntegration: true,
      onlinePayments: true,
      gdprCompliance: false,
      localDataResidency: false,
    },
  },
}
