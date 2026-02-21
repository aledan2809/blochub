'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, FileText, ArrowRight, Loader2 } from 'lucide-react'

interface FacturaDetails {
  numar: string
  total: number
  perioada: string
  status: string
  organizatie: string
}

export default function BillingSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const facturaId = searchParams.get('factura_id')

  const [isLoading, setIsLoading] = useState(true)
  const [factura, setFactura] = useState<FacturaDetails | null>(null)

  useEffect(() => {
    async function fetchFactura() {
      if (!facturaId) {
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/billing/factura/${facturaId}`)
        if (response.ok) {
          const data = await response.json()
          setFactura(data)
        }
      } catch (error) {
        console.error('Error fetching invoice:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFactura()
  }, [facturaId])

  const formatAmount = (amount: number) =>
    amount.toLocaleString('ro-RO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Plată confirmată!</CardTitle>
            <CardDescription>
              Abonamentul dumneavoastră a fost activat cu succes.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : factura ? (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Factură:</span>
                  <span className="font-medium">{factura.numar}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Organizație:</span>
                  <span className="font-medium">{factura.organizatie}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Perioada:</span>
                  <span className="font-medium">{factura.perioada}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-medium">Total plătit:</span>
                  <span className="text-xl font-bold text-green-600">
                    {formatAmount(factura.total)} lei
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-green-600 font-medium">
                  Plata a fost procesată cu succes!
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Veți primi factura pe email în câteva minute.
                </p>
              </div>
            )}

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Factura a fost trimisă pe email
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Verificați inbox-ul pentru factura în format PDF.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <Button onClick={() => router.push('/dashboard')} className="w-full">
                Continuă la Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/organizatie/facturi')}
                className="w-full"
              >
                Vezi istoricul facturilor
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
