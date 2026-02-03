/**
 * Country Modules Registry
 *
 * Central registry for managing country-specific modules and features.
 * This allows the application to dynamically load country-specific functionality
 * based on the association's country setting.
 */

import {
  CountryCode,
  CountryConfig,
  CountryModuleRegistry,
  FiscalIntegrationModule,
  COUNTRY_CONFIGS,
} from './types'
import { romaniaFiscalModule } from './ro/fiscal'

// Fiscal modules registry
const fiscalModules: Partial<Record<CountryCode, FiscalIntegrationModule>> = {
  RO: romaniaFiscalModule,
  // PL: polandFiscalModule, // KSeF - to be implemented
  // HU: hungaryFiscalModule, // NAV Online Számla - to be implemented
}

/**
 * Country Module Registry Implementation
 */
class CountryModuleRegistryImpl implements CountryModuleRegistry {
  /**
   * Get country configuration
   */
  getCountry(code: CountryCode): CountryConfig | null {
    return COUNTRY_CONFIGS[code] || null
  }

  /**
   * Get all supported countries
   */
  getAllCountries(): CountryConfig[] {
    return Object.values(COUNTRY_CONFIGS)
  }

  /**
   * Get fiscal module for a country
   */
  getFiscalModule(code: CountryCode): FiscalIntegrationModule | null {
    return fiscalModules[code] || null
  }

  /**
   * Check if country has fiscal integration
   */
  hasFiscalIntegration(code: CountryCode): boolean {
    const config = COUNTRY_CONFIGS[code]
    return config?.features.fiscalInvoicing === true && !!fiscalModules[code]
  }

  /**
   * Get countries with fiscal integration enabled
   */
  getCountriesWithFiscalIntegration(): CountryConfig[] {
    return Object.values(COUNTRY_CONFIGS).filter(
      (config) => config.features.fiscalInvoicing && fiscalModules[config.code]
    )
  }

  /**
   * Format currency amount for a country
   */
  formatCurrency(amount: number, code: CountryCode): string {
    const config = COUNTRY_CONFIGS[code]
    if (!config) return amount.toFixed(2)

    const formatted = amount.toFixed(2)
    const [integer, decimal] = formatted.split('.')

    // Format integer with thousands separator
    const intFormatted = integer.replace(/\B(?=(\d{3})+(?!\d))/g, config.numberFormat.thousands)

    return `${intFormatted}${config.numberFormat.decimal}${decimal} ${config.currencySymbol}`
  }

  /**
   * Format date for a country
   */
  formatDate(date: Date, code: CountryCode): string {
    const config = COUNTRY_CONFIGS[code]
    if (!config) return date.toLocaleDateString()

    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()

    return config.dateFormat
      .replace('DD', day)
      .replace('MM', month)
      .replace('YYYY', year.toString())
  }
}

// Export singleton instance
export const countryRegistry = new CountryModuleRegistryImpl()

// Re-export types
export * from './types'
export { romaniaFiscalModule } from './ro/fiscal'
