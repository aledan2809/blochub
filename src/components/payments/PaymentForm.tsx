'use client'

import { useState, useEffect } from 'react'
import {
  PaymentElement,
  Elements,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CreditCard, CheckCircle, XCircle } from 'lucide-react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface PaymentFormProps {
  chitantaId: string
  amount: number
  onSuccess?: () => void
  onCancel?: () => void
}

function CheckoutForm({ amount, onSuccess }: { amount: number; onSuccess?: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setLoading(true)
    setError(null)

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/portal/payments/success`,
      },
      redirect: 'if_required',
    })

    if (submitError) {
      setError(submitError.message || 'A apărut o eroare la procesarea plății.')
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      onSuccess?.()
    }
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Plată procesată cu succes!
        </h3>
        <p className="text-gray-600">
          Vei primi o confirmare pe email în câteva momente.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-800">
          Suma de plată: <span className="font-bold text-lg">{amount.toFixed(2)} RON</span>
        </p>
      </div>

      <PaymentElement />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || loading}
        className="w-full"
        size="lg"
        loading={loading}
      >
        <CreditCard className="mr-2 h-5 w-5" />
        Plătește {amount.toFixed(2)} RON
      </Button>

      <p className="text-xs text-center text-gray-500">
        Plățile sunt procesate securizat prin Stripe.
        Datele cardului nu sunt stocate pe serverele noastre.
      </p>
    </form>
  )
}

export function PaymentForm({ chitantaId, amount, onSuccess, onCancel }: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function createPaymentIntent() {
      try {
        const response = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chitantaId }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Eroare la inițializarea plății')
        }

        setClientSecret(data.clientSecret)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    createPaymentIntent()
  }, [chitantaId])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <span className="ml-3 text-gray-600">Se pregătește plata...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button variant="outline" onClick={onCancel}>
              Înapoi
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!clientSecret) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Plată online
        </CardTitle>
        <CardDescription>
          Introdu datele cardului pentru a efectua plata
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: '#2563eb',
              },
            },
          }}
        >
          <CheckoutForm amount={amount} onSuccess={onSuccess} />
        </Elements>
      </CardContent>
    </Card>
  )
}
