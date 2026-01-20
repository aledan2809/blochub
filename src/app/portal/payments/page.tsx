'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PaymentForm } from '@/components/payments/PaymentForm'
import {
  Receipt,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  ArrowLeft
} from 'lucide-react'

interface Chitanta {
  id: string
  numar: number
  luna: number
  an: number
  sumaTotal: number
  sumaRamasa: number
  status: string
  dataScadenta: string
}

export default function PaymentsPage() {
  const [chitante, setChitante] = useState<Chitanta[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChitanta, setSelectedChitanta] = useState<Chitanta | null>(null)

  useEffect(() => {
    async function fetchChitante() {
      try {
        const response = await fetch('/api/portal/chitante')
        if (response.ok) {
          const data = await response.json()
          setChitante(data)
        }
      } catch (error) {
        console.error('Error fetching chitante:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchChitante()
  }, [])

  const chitanteNeplatite = chitante.filter(c =>
    c.status !== 'PLATITA' && c.sumaRamasa > 0
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PLATITA':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3" /> Plătită
          </span>
        )
      case 'PARTIAL_PLATITA':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3" /> Parțial plătită
          </span>
        )
      case 'RESTANTA':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertCircle className="h-3 w-3" /> Restanță
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Receipt className="h-3 w-3" /> De plătit
          </span>
        )
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  if (selectedChitanta) {
    return (
      <div className="max-w-lg mx-auto">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => setSelectedChitanta(null)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Înapoi la lista de plăți
        </Button>

        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            Chitanța {selectedChitanta.numar}/{selectedChitanta.luna}/{selectedChitanta.an}
          </h2>
          <p className="text-sm text-gray-600">
            Scadentă la {formatDate(selectedChitanta.dataScadenta)}
          </p>
        </div>

        <PaymentForm
          chitantaId={selectedChitanta.id}
          amount={selectedChitanta.sumaRamasa}
          onSuccess={() => {
            setSelectedChitanta(null)
            window.location.reload()
          }}
          onCancel={() => setSelectedChitanta(null)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Plăți</h1>
        <p className="text-gray-600">Plătește online chitanțele de întreținere</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : chitanteNeplatite.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Totul este la zi!
              </h3>
              <p className="text-gray-600">
                Nu ai nicio chitanță de plătit momentan.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Chitanțe de plătit ({chitanteNeplatite.length})
              </CardTitle>
              <CardDescription>
                Selectează o chitanță pentru a o plăti online
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {chitanteNeplatite.map((chitanta) => (
                  <button
                    key={chitanta.id}
                    onClick={() => setSelectedChitanta(chitanta)}
                    className="w-full py-4 flex items-center justify-between hover:bg-gray-50 transition-colors -mx-4 px-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Receipt className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">
                          Chitanța {chitanta.numar}/{chitanta.luna}/{chitanta.an}
                        </p>
                        <p className="text-sm text-gray-500">
                          Scadentă: {formatDate(chitanta.dataScadenta)}
                        </p>
                        <div className="mt-1">
                          {getStatusBadge(chitanta.status)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          {chitanta.sumaRamasa.toFixed(2)} RON
                        </p>
                        {chitanta.sumaRamasa < chitanta.sumaTotal && (
                          <p className="text-xs text-gray-500">
                            din {chitanta.sumaTotal.toFixed(2)} RON
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Plată rapidă și sigură
                  </h3>
                  <p className="text-sm text-gray-600">
                    Acceptăm carduri Visa, Mastercard și plăți prin Apple Pay și Google Pay.
                    Toate plățile sunt procesate securizat prin Stripe.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
