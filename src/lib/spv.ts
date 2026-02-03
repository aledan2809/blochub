/**
 * SPV / e-Factura Integration Client
 *
 * Integrates with ANAF's e-Factura system for automatic invoice download.
 * Uses OAuth2 for authentication.
 *
 * ANAF API Documentation:
 * https://mfinante.gov.ro/static/10/eFactura/documentatie_oauth2.pdf
 * https://mfinante.gov.ro/static/10/eFactura/documentatie_api_efactura.pdf
 */

import { db } from './db'

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

// Types
export interface SPVOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export interface SPVTokens {
  accessToken: string
  refreshToken: string
  expiresAt: Date
}

export interface SPVMessage {
  id: string
  data_creare: string
  cif: string
  id_solicitare: string
  detalii: string
  tip: string
  id_descarcare?: string
}

export interface SPVListResponse {
  mesaje: SPVMessage[]
  titlu: string
  serial: string
  cui: string
  eroare?: string
}

export interface ParsedInvoice {
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
}

/**
 * Check if SPV integration is configured
 */
export function isSPVConfigured(): boolean {
  return !!(SPV_CLIENT_ID && SPV_CLIENT_SECRET && SPV_REDIRECT_URI)
}

/**
 * Get SPV OAuth configuration
 */
export function getSPVConfig(): SPVOAuthConfig {
  return {
    clientId: SPV_CLIENT_ID,
    clientSecret: SPV_CLIENT_SECRET,
    redirectUri: SPV_REDIRECT_URI,
  }
}

/**
 * Generate OAuth2 authorization URL for ANAF
 */
export function generateAuthUrl(state: string): string {
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
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<SPVTokens> {
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
    throw new Error(`Failed to exchange code: ${error}`)
  }

  const data = await response.json()

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<SPVTokens> {
  const response = await fetch(ANAF_OAUTH_TOKEN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: SPV_CLIENT_ID,
      client_secret: SPV_CLIENT_SECRET,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to refresh token: ${error}`)
  }

  const data = await response.json()

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  }
}

/**
 * Get valid access token (refresh if expired)
 */
export async function getValidAccessToken(asociatieId: string): Promise<string | null> {
  const credentials = await db.sPVCredentials.findUnique({
    where: { asociatieId },
  })

  if (!credentials || !credentials.accessToken) {
    return null
  }

  // Check if token is expired (with 5 min buffer)
  const bufferMs = 5 * 60 * 1000
  if (credentials.expiresAt && credentials.expiresAt.getTime() - bufferMs < Date.now()) {
    // Token expired, try to refresh
    if (!credentials.refreshToken) {
      return null
    }

    try {
      const newTokens = await refreshAccessToken(credentials.refreshToken)

      await db.sPVCredentials.update({
        where: { asociatieId },
        data: {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          expiresAt: newTokens.expiresAt,
        },
      })

      return newTokens.accessToken
    } catch (error) {
      console.error('Failed to refresh SPV token:', error)
      return null
    }
  }

  return credentials.accessToken
}

/**
 * Fetch invoice messages from ANAF
 *
 * @param cui - CUI of the association
 * @param accessToken - Valid access token
 * @param zile - Number of days to look back (default 60)
 */
export async function fetchInvoiceMessages(
  cui: string,
  accessToken: string,
  zile: number = 60
): Promise<SPVListResponse> {
  const params = new URLSearchParams({
    zile: zile.toString(),
    cif: cui,
  })

  const response = await fetch(`${ANAF_API_MESSAGES}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to fetch messages: ${error}`)
  }

  return response.json()
}

/**
 * Download invoice XML from ANAF
 *
 * @param id - Download ID from message
 * @param accessToken - Valid access token
 */
export async function downloadInvoiceXML(
  id: string,
  accessToken: string
): Promise<string> {
  const response = await fetch(`${ANAF_API_DOWNLOAD}?id=${id}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/xml',
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to download invoice: ${error}`)
  }

  return response.text()
}

/**
 * Parse invoice XML to extract relevant data
 * This is a basic parser - in production, use a proper XML parser
 */
export function parseInvoiceXML(xml: string, message: SPVMessage): ParsedInvoice {
  // Basic regex parsing - for production, use xml2js or similar
  const getTagValue = (tag: string): string => {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i'))
    return match ? match[1].trim() : ''
  }

  const getNestedValue = (path: string[]): string => {
    let result = ''
    try {
      let pattern = path.map(tag => `<${tag}[^>]*>`).join('.*?')
      pattern += `([^<]*)`
      const match = xml.match(new RegExp(pattern, 'is'))
      result = match ? match[1].trim() : ''
    } catch {
      result = ''
    }
    return result
  }

  // Extract data from UBL Invoice format
  const cuiFurnizor = getNestedValue(['cac:AccountingSupplierParty', 'cbc:CompanyID']) ||
                      getNestedValue(['cac:SellerParty', 'cbc:CompanyID']) ||
                      message.cif

  const numeFurnizor = getNestedValue(['cac:AccountingSupplierParty', 'cbc:Name']) ||
                       getNestedValue(['cac:AccountingSupplierParty', 'cbc:RegistrationName']) ||
                       getNestedValue(['cac:SellerParty', 'cbc:Name']) ||
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

/**
 * Sync invoices for an association
 */
export async function syncInvoices(asociatieId: string): Promise<{
  success: boolean
  imported: number
  skipped: number
  errors: string[]
}> {
  const result = {
    success: false,
    imported: 0,
    skipped: 0,
    errors: [] as string[],
  }

  try {
    // Get credentials
    const credentials = await db.sPVCredentials.findUnique({
      where: { asociatieId },
    })

    if (!credentials || !credentials.cuiAsociatie) {
      result.errors.push('SPV nu este configurat pentru această asociație')
      return result
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(asociatieId)
    if (!accessToken) {
      result.errors.push('Token-ul SPV a expirat. Vă rugăm reconectați-vă.')
      return result
    }

    // Fetch messages
    const messages = await fetchInvoiceMessages(credentials.cuiAsociatie, accessToken)

    if (messages.eroare) {
      result.errors.push(`ANAF: ${messages.eroare}`)
      return result
    }

    // Process each message
    for (const message of messages.mesaje || []) {
      try {
        // Check if already imported
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

        // Download XML if it's a primire (received invoice)
        if (message.tip === 'PRIMIRE' && message.id_descarcare) {
          const xmlContent = await downloadInvoiceXML(message.id_descarcare, accessToken)
          const parsed = parseInvoiceXML(xmlContent, message)

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
              xmlUrl: parsed.xmlContent.substring(0, 10000), // Store first 10KB
              detaliiJson: parsed.detaliiJson,
              status: 'NOUA',
            },
          })

          result.imported++
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Eroare necunoscută'
        result.errors.push(`Factura ${message.id_solicitare}: ${errorMsg}`)
      }
    }

    // Update last sync time
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
    const errorMsg = error instanceof Error ? error.message : 'Eroare necunoscută'
    result.errors.push(errorMsg)
    return result
  }
}

/**
 * Disconnect SPV (remove credentials)
 */
export async function disconnectSPV(asociatieId: string): Promise<void> {
  await db.sPVCredentials.delete({
    where: { asociatieId },
  }).catch(() => {
    // Ignore if doesn't exist
  })
}
