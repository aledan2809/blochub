'use client'

import Link from 'next/link'
import {
  CreditCard,
  FileText,
  Gauge,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Calendar,
  MessageSquare,
  Wrench,
  ClipboardList,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// Mock data - in production comes from API
const userData = {
  name: 'Ion Popescu',
  apartament: '42',
  asociatie: 'Bloc Mihai Eminescu 23',
  adresa: 'Str. Mihai Eminescu 23, București',
}

const soldData = {
  dePlata: 520,
  restanta: 0,
  ultimaPlata: '15 Dec 2025',
  ultimaChitanta: { luna: 'Ianuarie 2026', suma: 520 },
}

const chitanteRecente = [
  { luna: 'Ianuarie 2026', suma: 520, status: 'neplatit', scadenta: '25 Ian 2026' },
  { luna: 'Decembrie 2025', suma: 480, status: 'platit', dataPlatii: '18 Dec 2025' },
  { luna: 'Noiembrie 2025', suma: 510, status: 'platit', dataPlatii: '20 Nov 2025' },
]

const contoareData = [
  { tip: 'Apă rece', index: 245, luna: 'Ianuarie', unitati: 'mc' },
  { tip: 'Apă caldă', index: 87, luna: 'Ianuarie', unitati: 'mc' },
  { tip: 'Gaz', index: 1250, luna: 'Ianuarie', unitati: 'mc' },
]

export default function PortalHomePage() {
  const hasDebt = soldData.dePlata > 0

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bună, {userData.name.split(' ')[0]}!
        </h1>
        <p className="text-gray-500">
          Apartament {userData.apartament} • {userData.asociatie}
        </p>
      </div>

      {/* Balance Card */}
      <Card className={hasDebt ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sold curent</p>
              <p className={`text-3xl font-bold ${hasDebt ? 'text-orange-600' : 'text-green-600'}`}>
                {soldData.dePlata > 0 ? `-${soldData.dePlata}` : '0'} lei
              </p>
              {hasDebt && (
                <p className="text-sm text-gray-500 mt-1">
                  Scadență: {chitanteRecente[0].scadenta}
                </p>
              )}
            </div>
            {hasDebt && (
              <Link href="/portal/plati/nou">
                <Button size="lg" className="bg-orange-600 hover:bg-orange-700">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Plătește acum
                </Button>
              </Link>
            )}
            {!hasDebt && (
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Consum mediu</p>
                <p className="font-semibold">485 lei/lună</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Ultima plată</p>
                <p className="font-semibold">{soldData.ultimaPlata}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chitante Recente */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Chitanțe recente</CardTitle>
            <Link href="/portal/chitante" className="text-blue-600 text-sm font-medium">
              Vezi toate
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {chitanteRecente.map((chitanta, i) => (
            <Link
              key={i}
              href={`/portal/chitante/${i}`}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center border">
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="font-medium">{chitanta.luna}</p>
                  <p className="text-sm text-gray-500">
                    {chitanta.status === 'platit'
                      ? `Plătit ${chitanta.dataPlatii}`
                      : `Scadență ${chitanta.scadenta}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-semibold">{chitanta.suma} lei</p>
                  <StatusBadge status={chitanta.status} />
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* Contoare */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Indexuri curente</CardTitle>
            <Link href="/portal/contoare" className="text-blue-600 text-sm font-medium">
              Trimite indexi
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {contoareData.map((contor, i) => (
              <div key={i} className="text-center p-3 rounded-lg bg-gray-50">
                <Gauge className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">{contor.tip}</p>
                <p className="font-semibold">
                  {contor.index} {contor.unitati}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Reminder: Trimite indexii până pe 25 Ianuarie
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Poți fotografia contoarele direct din aplicație
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/portal/sesizari">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 pb-6 text-center">
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-3">
                <Wrench className="h-6 w-6 text-orange-600" />
              </div>
              <p className="font-medium">Sesizări</p>
              <p className="text-sm text-gray-500">Raportează probleme</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/portal/chat">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 pb-6 text-center">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <p className="font-medium">Chat cu AI</p>
              <p className="text-sm text-gray-500">Întreabă orice</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* More Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/portal/avizier">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 pb-6 text-center">
              <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-3">
                <ClipboardList className="h-6 w-6 text-teal-600" />
              </div>
              <p className="font-medium">Avizier</p>
              <p className="text-sm text-gray-500">Cheltuieli bloc</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/portal/documente">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 pb-6 text-center">
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <p className="font-medium">Documente</p>
              <p className="text-sm text-gray-500">AVG, regulamente</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link href="/portal/payments">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 pb-6 text-center">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <CreditCard className="h-6 w-6 text-green-600" />
              </div>
              <p className="font-medium">Plăți</p>
              <p className="text-sm text-gray-500">Istoric plăți</p>
            </CardContent>
          </Card>
        </Link>
        <div></div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'platit') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle className="h-3 w-3" />
        Plătit
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
      <AlertCircle className="h-3 w-3" />
      De plată
    </span>
  )
}
