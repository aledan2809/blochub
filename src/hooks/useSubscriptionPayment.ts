'use client'

/**
 * Hook for initiating subscription payments via Revolut
 */

import { useState, useCallback } from 'react'
import { toast } from 'sonner'

interface PaymentData {
  organizatieId: string
  ciclulFacturare?: 'LUNAR' | 'TRIMESTRIAL' | 'ANUAL'
}

interface PaymentResponse {
  success: boolean
  facturaId?: string
  paymentId?: string
  checkoutUrl?: string
  pricing?: {
    apartamente: number
    pretPerApartament: number
    subtotal: number
    tva: number
    total: number
    ciclu: string
  }
  error?: string
}

export function useSubscriptionPayment() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createPayment = useCallback(async (data: PaymentData): Promise<PaymentResponse> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/billing/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        const errorMsg = result.error || 'Eroare la crearea plății'
        setError(errorMsg)
        toast.error(errorMsg)
        return { success: false, error: errorMsg }
      }

      // Success - redirect to Revolut checkout
      if (result.checkoutUrl) {
        toast.success('Redirecționare către plată...')

        // Small delay to show toast
        setTimeout(() => {
          window.location.href = result.checkoutUrl
        }, 500)
      }

      return {
        success: true,
        facturaId: result.facturaId,
        paymentId: result.paymentId,
        checkoutUrl: result.checkoutUrl,
        pricing: result.pricing,
      }
    } catch (err) {
      console.error('Create payment error:', err)
      const errorMsg = 'A apărut o eroare neașteptată. Vă rugăm să încercați din nou.'
      setError(errorMsg)
      toast.error(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getSubscriptionPricing = useCallback(
    async (
      organizatieId: string,
      ciclu: 'LUNAR' | 'TRIMESTRIAL' | 'ANUAL' = 'LUNAR'
    ): Promise<PaymentResponse['pricing'] | null> => {
      try {
        const response = await fetch('/api/billing/pricing', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ organizatieId, ciclulFacturare: ciclu }),
        })

        if (!response.ok) {
          return null
        }

        const result = await response.json()
        return result.pricing
      } catch {
        return null
      }
    },
    []
  )

  return {
    createPayment,
    getSubscriptionPricing,
    isLoading,
    error,
  }
}
