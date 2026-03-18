import Stripe from 'stripe'
import { db } from '@/lib/db'

// Create a lazy-initialized Stripe instance
// This allows the app to run without STRIPE_SECRET_KEY if Stripe features aren't used
let stripeInstance: Stripe | null = null
let stripeKeySource: string | null = null // track which key was used

/**
 * Get Stripe secret key: first try PlatformSettings DB, then fall back to env var.
 */
async function getStripeSecretKey(): Promise<string> {
  try {
    const settings = await db.platformSettings.findUnique({
      where: { id: 'default' },
      select: { stripeSecretKey: true },
    })
    if (settings?.stripeSecretKey) {
      return settings.stripeSecretKey
    }
  } catch {
    // DB not available, fall back to env
  }

  if (process.env.STRIPE_SECRET_KEY) {
    return process.env.STRIPE_SECRET_KEY
  }

  throw new Error(
    'Stripe secret key is not configured. Set it in Admin Settings or STRIPE_SECRET_KEY env var.'
  )
}

async function getStripeInstanceAsync(): Promise<Stripe> {
  const key = await getStripeSecretKey()

  // Re-create instance if key changed (e.g., updated in admin settings)
  if (stripeInstance && stripeKeySource === key) {
    return stripeInstance
  }

  stripeInstance = new Stripe(key, {
    apiVersion: '2025-12-15.clover',
    typescript: true,
  })
  stripeKeySource = key
  return stripeInstance
}

function getStripeInstanceSync(): Stripe {
  if (!stripeInstance) {
    // Synchronous fallback: use env var only
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error(
        'Stripe not initialized. Call getStripe() first or set STRIPE_SECRET_KEY env var.'
      )
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    })
    stripeKeySource = process.env.STRIPE_SECRET_KEY
  }
  return stripeInstance
}

/**
 * Async getter — preferred. Reads key from DB (PlatformSettings) with env fallback.
 */
export async function getStripe(): Promise<Stripe> {
  return getStripeInstanceAsync()
}

// Export a proxy that lazily initializes Stripe (sync fallback for existing code)
export const stripe = new Proxy({} as Stripe, {
  get(target, prop) {
    const instance = getStripeInstanceSync()
    const value = (instance as any)[prop]
    if (typeof value === 'function') {
      return value.bind(instance)
    }
    return value
  },
})

export const STRIPE_CONFIG = {
  currency: 'ron',
  country: 'RO',
  paymentMethods: ['card'],
}

export function formatAmountForStripe(amount: number): number {
  return Math.round(amount * 100)
}

export function formatAmountFromStripe(amount: number): number {
  return amount / 100
}
