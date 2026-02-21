'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XCircle, RefreshCw, ArrowLeft, HelpCircle } from 'lucide-react'

export default function BillingFailedPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const facturaId = searchParams.get('factura_id')

  const handleRetry = () => {
    // Go back to billing page to retry payment
    router.push('/dashboard/organizatie/abonament')
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Plata nu a reușit</CardTitle>
            <CardDescription>
              A apărut o problemă la procesarea plății dumneavoastră.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm text-red-800">
                Tranzacția a fost anulată sau refuzată. Acest lucru se poate întâmpla din
                mai multe motive:
              </p>
              <ul className="mt-3 text-sm text-red-700 space-y-1.5 ml-4 list-disc">
                <li>Fonduri insuficiente pe card</li>
                <li>Cardul a fost blocat sau a expirat</li>
                <li>Limită de tranzacționare depășită</li>
                <li>Tranzacția a fost anulată de utilizator</li>
              </ul>
            </div>

            <div className="bg-amber-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    Abonamentul nu a fost modificat
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Nu s-a efectuat nicio modificare asupra contului dumneavoastră. Puteți
                    încerca din nou sau contacta suportul pentru asistență.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <Button onClick={handleRetry} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Încearcă din nou
              </Button>
              <Button variant="outline" onClick={() => router.push('/dashboard')} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Înapoi la Dashboard
              </Button>
            </div>

            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Aveți nevoie de ajutor?{' '}
                <a
                  href="mailto:support@blochub.ro"
                  className="text-primary hover:underline font-medium"
                >
                  Contactați suportul
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
