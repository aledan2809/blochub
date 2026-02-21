/**
 * Revolut Integration for BlocHub
 *
 * Inlined from @aledan/revolut-integration (Turbopack can't resolve file: links)
 */

import { db } from './db'
import { createHmac } from 'crypto'

// ============================================
// TYPES
// ============================================

export interface RevolutConfig {
  apiKey: string
  environment: 'sandbox' | 'production'
  webhookSecret?: string
}

export interface CreateOrderPayload {
  amount: number
  currency?: string
  merchantOrderRef: string
  customerEmail: string
  description: string
  redirectUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
}

export interface RevolutOrder {
  id: string
  public_id: string
  type: string
  state: OrderState
  created_at: string
  updated_at: string
  completed_at?: string
  checkout_url: string
  order_amount: {
    value: number
    currency: string
  }
  merchant_order_ext_ref?: string
}

export type OrderState =
  | 'pending'
  | 'processing'
  | 'authorised'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type WebhookEvent =
  | 'ORDER_COMPLETED'
  | 'ORDER_PAYMENT_AUTHENTICATED'
  | 'ORDER_PAYMENT_AUTHORISED'
  | 'ORDER_PAYMENT_DECLINED'
  | 'ORDER_PAYMENT_FAILED'
  | 'ORDER_CANCELLED'
  | 'REFUND_COMPLETED'

export interface RevolutWebhookPayload {
  event: WebhookEvent
  timestamp: string
  order_id: string
  merchant_order_ext_ref?: string
  data?: WebhookOrderData
}

export interface WebhookOrderData {
  id: string
  type: string
  state: string
  created_at: string
  updated_at: string
  completed_at?: string
  description?: string
  order_amount: {
    value: number
    currency: string
  }
  payments?: PaymentInfo[]
}

export interface PaymentInfo {
  id: string
  state: string
  payment_method: {
    type: string
    card?: {
      card_brand: string
      card_last_four: string
      card_expiry_month?: number
      card_expiry_year?: number
    }
  }
}

export interface RefundResult {
  id: string
  state: string
  amount?: {
    value: number
    currency: string
  }
}

export class RevolutError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: string
  ) {
    super(message)
    this.name = 'RevolutError'
  }
}

// ============================================
// UTILITIES
// ============================================

export function formatAmount(amount: number, currency = 'RON'): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function generateOrderRef(prefix = 'ORD'): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

export function addTVA(
  netAmount: number,
  vatRate = 0.19
): { net: number; vat: number; gross: number } {
  const vat = netAmount * vatRate
  const gross = netAmount + vat
  return {
    net: netAmount,
    vat: Math.round(vat * 100) / 100,
    gross: Math.round(gross * 100) / 100,
  }
}

// ============================================
// CLIENT
// ============================================

export class RevolutClient {
  private apiKey: string
  private baseUrl: string
  private webhookSecret?: string

  constructor(config: RevolutConfig) {
    this.apiKey = config.apiKey
    this.webhookSecret = config.webhookSecret
    this.baseUrl =
      config.environment === 'production'
        ? 'https://merchant.revolut.com/api/1.0'
        : 'https://sandbox-merchant.revolut.com/api/1.0'
  }

  async createOrder(payload: CreateOrderPayload): Promise<RevolutOrder> {
    const response = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(payload.amount * 100),
        currency: payload.currency || 'RON',
        merchant_order_ext_ref: payload.merchantOrderRef,
        customer_email: payload.customerEmail,
        description: payload.description,
        redirect_url: payload.redirectUrl,
        cancel_redirect_url: payload.cancelUrl,
        metadata: payload.metadata,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new RevolutError(
        `Failed to create order: ${response.status}`,
        response.status,
        errorText
      )
    }

    return response.json() as Promise<RevolutOrder>
  }

  async getOrder(orderId: string): Promise<RevolutOrder> {
    const response = await fetch(`${this.baseUrl}/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new RevolutError(
        `Failed to get order: ${response.status}`,
        response.status
      )
    }

    return response.json() as Promise<RevolutOrder>
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      console.warn('Webhook secret not configured, skipping verification')
      return true
    }

    try {
      const expectedSignature = createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex')

      if (expectedSignature.length !== signature.length) {
        return false
      }

      let result = 0
      for (let i = 0; i < expectedSignature.length; i++) {
        result |= expectedSignature.charCodeAt(i) ^ signature.charCodeAt(i)
      }
      return result === 0
    } catch (error) {
      console.error('Signature verification error:', error)
      return false
    }
  }

  parseWebhook(
    rawBody: string,
    signature: string
  ): RevolutWebhookPayload | null {
    if (!this.verifyWebhookSignature(rawBody, signature)) {
      console.error('Invalid webhook signature')
      return null
    }

    try {
      return JSON.parse(rawBody) as RevolutWebhookPayload
    } catch (error) {
      console.error('Failed to parse webhook payload:', error)
      return null
    }
  }
}

// ============================================
// BLOCHUB-SPECIFIC FUNCTIONS
// ============================================

/**
 * Get Revolut client with credentials from env
 */
export async function getRevolutClient(): Promise<RevolutClient | null> {
  const apiKey = process.env.REVOLUT_API_KEY
  const webhookSecret = process.env.REVOLUT_WEBHOOK_SECRET
  const environment = (process.env.REVOLUT_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production'

  if (!apiKey) {
    console.error('Revolut API key not configured in .env')
    return null
  }

  return new RevolutClient({
    apiKey,
    webhookSecret: webhookSecret || undefined,
    environment,
  })
}

/**
 * Calculate subscription price for an organization
 */
export async function calculateSubscriptionPrice(organizatieId: string): Promise<{
  apartamente: number
  pretPerApartament: number
  subtotal: number
  tva: number
  total: number
}> {
  const org = await db.organizatie.findUnique({
    where: { id: organizatieId },
    include: {
      abonament: { include: { plan: true } },
      asociatii: { include: { apartamente: true } },
    },
  })

  if (!org?.abonament) {
    throw new Error('No active subscription')
  }

  const apartamente = org.asociatii.reduce(
    (total: number, a: { apartamente: { length: number } }) => total + a.apartamente.length,
    0
  )
  const pretPerApartament = org.abonament.plan.pretPerApartament
  const pretMinimLunar = org.abonament.plan.pretMinimLunar

  const subtotal = Math.max(apartamente * pretPerApartament, pretMinimLunar)
  const tva = subtotal * 0.19

  return {
    apartamente,
    pretPerApartament,
    subtotal,
    tva,
    total: Math.round((subtotal + tva) * 100) / 100,
  }
}

/**
 * Get company billing details from platform settings
 */
export async function getCompanyBillingDetails(): Promise<{
  name: string
  cui: string
  address: string
  city: string
  county: string
  country: string
  iban: string
  bank: string
  email: string
} | null> {
  const settings = await db.platformSettings.findUnique({
    where: { id: 'default' },
  })

  if (!settings) return null

  return {
    name: settings.companyName || 'BlocHub SRL',
    cui: settings.companyCui || '',
    address: settings.companyAddress || '',
    city: settings.companyCity || '',
    county: settings.companyCounty || '',
    country: settings.companyCountry || 'România',
    iban: settings.companyIban || '',
    bank: settings.companyBank || '',
    email: settings.companyEmail || '',
  }
}

/**
 * Check payment status by order reference
 */
export async function checkPaymentStatus(orderRef: string): Promise<{
  status: 'pending' | 'completed' | 'failed' | 'not_found'
  order?: RevolutOrder
}> {
  const plata = await db.plata.findFirst({
    where: { referinta: orderRef },
  }) as any

  if (!plata) {
    return { status: 'not_found' }
  }

  const client = await getRevolutClient()
  if (!client) {
    const dbStatus = plata.status === 'CONFIRMED' ? 'completed' :
                     plata.status === 'FAILED' ? 'failed' : 'pending'
    return { status: dbStatus as 'pending' | 'completed' | 'failed' }
  }

  try {
    const revolutOrderId = plata.stripePaymentId || plata.detalii?.revolutOrderId
    if (!revolutOrderId) {
      return { status: 'pending' }
    }

    const order = await client.getOrder(revolutOrderId)

    if (order.state === 'completed' && plata.status !== 'CONFIRMED') {
      await db.plata.update({
        where: { id: plata.id },
        data: { status: 'CONFIRMED' },
      })
      return { status: 'completed', order }
    }

    if (['failed', 'cancelled'].includes(order.state) && plata.status !== 'FAILED') {
      await db.plata.update({
        where: { id: plata.id },
        data: { status: 'FAILED' },
      })
      return { status: 'failed', order }
    }

    return {
      status: order.state === 'completed' ? 'completed' :
              ['failed', 'cancelled'].includes(order.state) ? 'failed' : 'pending',
      order,
    }
  } catch (error) {
    console.error('Failed to check payment status:', error)
    return { status: 'pending' }
  }
}
