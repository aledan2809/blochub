/**
 * Romania - Fiscal Integration Module
 *
 * SPV / e-Factura (ANAF) Integration
 *
 * This module implements the FiscalIntegrationModule interface for Romania's
 * mandatory e-invoicing system managed by ANAF (Agenția Națională de Administrare Fiscală).
 *
 * Key features:
 * - OAuth2 authentication with ANAF
 * - Automatic invoice download from SPV
 * - XML parsing for UBL invoices
 */

import { db } from '@/lib/db'
import {
  FiscalIntegrationModule,
  FiscalOAuthResult,
  FiscalSyncResult,
  FiscalInvoice,
  FiscalInvoiceFilters,
  FiscalInvoiceDownload,
} from '../types'

// Environment variables
const SPV_CLIENT_ID = process.env.ANAF_SPV_CLIENT_ID || ''
const SPV_CLIENT_SECRET = process.env.ANAF_SPV_CLIENT_SECRET || ''
const SPV_REDIRECT_URI = process.env.ANAF_SPV_REDIRECT_URI || ''

// ANAF OAuth endpoints
const ANAF_OAUTH_BASE = 'https://logincert.anaf.ro/anaf-oauth2/v1'
const ANAF_OAUTH_AUTHORIZE = `${ANAF_OAUTH_BASE}/authorize`
const ANAF_OAUTH_TOKEN = `${ANAF_OAUTH_BASE}/token`

// ANAF e-Factura API endpoints
const ANAF_API_BASE = process.env.ANAF_SPV_API_URL || 'https://api.anaf.ro/prod/FCTEL/rest'
const ANAF_API_MESSAGES = `${ANAF_API_BASE}/listaMesajeFactura`
const ANAF_API_DOWNLOAD = `${ANAF_API_BASE}/descarcare`

interface SPVMessage {
  id: string
  data_creare: string
  cif: string
  id_solicitare: string
  detalii: string
  tip: string
  id_descarcare?: string
}

interface SPVTokens {
  accessToken: string
  refreshToken: string
  expiresAt: Date
}

/**
 * Romanian Fiscal Integration (SPV/e-Factura)
 */
export class RomaniaFiscalModule implements FiscalIntegrationModule {
  readonly countryCode = 'RO' as const
  readonly systemName = 'SPV / e-Factura'
  readonly systemUrl = 'https://www.anaf.ro/anaf/internet/ANAF/servicii_online/e_factura'

  /**
   * Check if SPV is configured
   */
  isConfigured(): boolean {
    return !!(SPV_CLIENT_ID && SPV_CLIENT_SECRET && SPV_REDIRECT_URI)
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: SPV_CLIENT_ID,
      redirect_uri: SPV_REDIRECT_URI,
      token_content_type: 'jwt',
      state,
    })

    return `${ANAF_OAUTH_AUTHORIZE}?${params.toString()}`
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(code: string, state: string): Promise<FiscalOAuthResult> {
    try {
      // Exchange code for tokens
      const response = await fetch(ANAF_OAUTH_TOKEN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: SPV_CLIENT_ID,
          client_secret: SPV_CLIENT_SECRET,
          redirect_uri: SPV_REDIRECT_URI,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        return { success: false, error: `ANAF OAuth error: ${error}` }
      }

      const data = await response.json()
      const expiresAt = new Date(Date.now() + data.expires_in * 1000)

      return {
        success: true,
        expiresAt,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(asociatieId: string): Promise<boolean> {
    try {
      const credentials = await db.sPVCredentials.findUnique({
        where: { asociatieId },
      })

      if (!credentials?.refreshToken) {
        return false
      }

      const response = await fetch(ANAF_OAUTH_TOKEN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: credentials.refreshToken,
          client_id: SPV_CLIENT_ID,
          client_secret: SPV_CLIENT_SECRET,
        }),
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()

      await db.sPVCredentials.update({
        where: { asociatieId },
        data: {
          accessToken: data.access_token,
          refreshToken: data.refresh_token || credentials.refreshToken,
          expiresAt: new Date(Date.now() + data.expires_in * 1000),
        },
      })

      return true
    } catch {
      return false
    }
  }

  /**
   * Disconnect SPV
   */
  async disconnect(asociatieId: string): Promise<void> {
    await db.sPVCredentials.delete({
      where: { asociatieId },
    }).catch(() => {})
  }

  /**
   * Sync invoices from ANAF
   */
  async syncInvoices(asociatieId: string): Promise<FiscalSyncResult> {
    const result: FiscalSyncResult = {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [],
      syncedAt: new Date(),
    }

    try {
      const credentials = await db.sPVCredentials.findUnique({
        where: { asociatieId },
      })

      if (!credentials?.accessToken || !credentials?.cuiAsociatie) {
        result.errors.push('SPV nu este configurat')
        return result
      }

      // Check token expiry
      const accessToken = await this.getValidAccessToken(asociatieId)
      if (!accessToken) {
        result.errors.push('Token-ul SPV a expirat')
        return result
      }

      // Fetch messages from ANAF
      const params = new URLSearchParams({
        zile: '60',
        cif: credentials.cuiAsociatie,
      })

      const response = await fetch(`${ANAF_API_MESSAGES}?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        result.errors.push(`ANAF API error: ${response.status}`)
        return result
      }

      const data = await response.json()

      if (data.eroare) {
        result.errors.push(`ANAF: ${data.eroare}`)
        return result
      }

      // Process messages
      for (const message of data.mesaje || []) {
        try {
          // Check if already exists
          const existing = await db.facturaSPV.findUnique({
            where: {
              asociatieId_spvId: {
                asociatieId,
                spvId: message.id_solicitare,
              },
            },
          })

          if (existing) {
            result.skipped++
            continue
          }

          // Only process received invoices
          if (message.tip === 'PRIMIRE' && message.id_descarcare) {
            const xmlContent = await this.downloadInvoiceXML(message.id_descarcare, accessToken)
            const parsed = this.parseInvoiceXML(xmlContent, message)

            await db.facturaSPV.create({
              data: {
                asociatieId,
                spvId: parsed.spvId,
                idDescarcare: parsed.idDescarcare,
                cuiFurnizor: parsed.cuiFurnizor,
                numeFurnizor: parsed.numeFurnizor,
                numarFactura: parsed.numarFactura,
                dataFactura: parsed.dataFactura,
                dataScadenta: parsed.dataScadenta,
                sumaTotal: parsed.sumaTotal,
                sumaTVA: parsed.sumaTVA,
                moneda: parsed.moneda,
                xmlUrl: parsed.xmlContent.substring(0, 10000),
                detaliiJson: parsed.detaliiJson,
                status: 'NOUA',
              },
            })

            result.imported++
          }
        } catch (error) {
          result.errors.push(
            `Factura ${message.id_solicitare}: ${error instanceof Error ? error.message : 'Eroare'}`
          )
        }
      }

      // Update sync status
      await db.sPVCredentials.update({
        where: { asociatieId },
        data: {
          lastSync: new Date(),
          lastSyncError: result.errors.length > 0 ? result.errors.join('; ') : null,
        },
      })

      result.success = result.errors.length === 0
      return result
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Eroare necunoscută')
      return result
    }
  }

  /**
   * Get invoices from database
   */
  async getInvoices(asociatieId: string, filters?: FiscalInvoiceFilters): Promise<FiscalInvoice[]> {
    const where: any = { asociatieId }

    if (filters?.status) {
      const statusMap: Record<string, string> = {
        new: 'NOUA',
        processed: 'PROCESATA',
        ignored: 'IGNORATA',
        error: 'EROARE',
      }
      where.status = statusMap[filters.status]
    }

    if (filters?.fromDate) {
      where.dataFactura = { ...where.dataFactura, gte: filters.fromDate }
    }

    if (filters?.toDate) {
      where.dataFactura = { ...where.dataFactura, lte: filters.toDate }
    }

    if (filters?.supplierId) {
      where.cuiFurnizor = filters.supplierId
    }

    const invoices = await db.facturaSPV.findMany({
      where,
      orderBy: { dataFactura: 'desc' },
    })

    return invoices.map((inv) => ({
      id: inv.id,
      systemId: inv.spvId,
      supplierTaxId: inv.cuiFurnizor,
      supplierName: inv.numeFurnizor,
      invoiceNumber: inv.numarFactura,
      issueDate: inv.dataFactura,
      dueDate: inv.dataScadenta || undefined,
      totalAmount: inv.sumaTotal,
      taxAmount: inv.sumaTVA || undefined,
      currency: inv.moneda,
      status: inv.status.toLowerCase() as 'new' | 'processed' | 'ignored' | 'error',
      rawData: inv.detaliiJson || undefined,
    }))
  }

  /**
   * Download invoice
   */
  async downloadInvoice(asociatieId: string, invoiceId: string): Promise<FiscalInvoiceDownload> {
    try {
      const invoice = await db.facturaSPV.findFirst({
        where: { id: invoiceId, asociatieId },
      })

      if (!invoice) {
        return { success: false, error: 'Factura nu a fost găsită' }
      }

      return {
        success: true,
        xml: invoice.xmlUrl || undefined,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Eroare',
      }
    }
  }

  // Private methods

  private async getValidAccessToken(asociatieId: string): Promise<string | null> {
    const credentials = await db.sPVCredentials.findUnique({
      where: { asociatieId },
    })

    if (!credentials?.accessToken) {
      return null
    }

    // Check if token is expired (with 5 min buffer)
    const bufferMs = 5 * 60 * 1000
    if (credentials.expiresAt && credentials.expiresAt.getTime() - bufferMs < Date.now()) {
      const refreshed = await this.refreshToken(asociatieId)
      if (!refreshed) return null

      const updated = await db.sPVCredentials.findUnique({
        where: { asociatieId },
      })
      return updated?.accessToken || null
    }

    return credentials.accessToken
  }

  private async downloadInvoiceXML(id: string, accessToken: string): Promise<string> {
    const response = await fetch(`${ANAF_API_DOWNLOAD}?id=${id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/xml',
      },
    })

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`)
    }

    return response.text()
  }

  private parseInvoiceXML(
    xml: string,
    message: SPVMessage
  ): {
    spvId: string
    idDescarcare: string | null
    cuiFurnizor: string
    numeFurnizor: string
    numarFactura: string
    dataFactura: Date
    dataScadenta: Date | null
    sumaTotal: number
    sumaTVA: number | null
    moneda: string
    xmlContent: string
    detaliiJson: string
  } {
    const getTagValue = (tag: string): string => {
      const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i'))
      return match ? match[1].trim() : ''
    }

    const getNestedValue = (path: string[]): string => {
      let result = ''
      try {
        let pattern = path.map((tag) => `<${tag}[^>]*>`).join('.*?')
        pattern += `([^<]*)`
        const match = xml.match(new RegExp(pattern, 'is'))
        result = match ? match[1].trim() : ''
      } catch {
        result = ''
      }
      return result
    }

    const cuiFurnizor =
      getNestedValue(['cac:AccountingSupplierParty', 'cbc:CompanyID']) ||
      getNestedValue(['cac:SellerParty', 'cbc:CompanyID']) ||
      message.cif

    const numeFurnizor =
      getNestedValue(['cac:AccountingSupplierParty', 'cbc:Name']) ||
      getNestedValue(['cac:AccountingSupplierParty', 'cbc:RegistrationName']) ||
      'Furnizor necunoscut'

    const numarFactura = getTagValue('cbc:ID') || message.id_solicitare

    const dataFacturaStr = getTagValue('cbc:IssueDate')
    const dataFactura = dataFacturaStr ? new Date(dataFacturaStr) : new Date()

    const dataScadentaStr = getTagValue('cbc:DueDate')
    const dataScadenta = dataScadentaStr ? new Date(dataScadentaStr) : null

    const sumaTotalStr = getTagValue('cbc:PayableAmount') || getTagValue('cbc:TaxInclusiveAmount')
    const sumaTotal = parseFloat(sumaTotalStr) || 0

    const sumaTVAStr = getTagValue('cbc:TaxAmount')
    const sumaTVA = sumaTVAStr ? parseFloat(sumaTVAStr) : null

    const moneda = xml.match(/currencyID="([A-Z]{3})"/)?.[1] || 'RON'

    return {
      spvId: message.id_solicitare,
      idDescarcare: message.id_descarcare || null,
      cuiFurnizor,
      numeFurnizor,
      numarFactura,
      dataFactura,
      dataScadenta,
      sumaTotal,
      sumaTVA,
      moneda,
      xmlContent: xml,
      detaliiJson: JSON.stringify(message),
    }
  }
}

// Export singleton instance
export const romaniaFiscalModule = new RomaniaFiscalModule()
