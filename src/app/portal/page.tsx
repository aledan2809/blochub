'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  CreditCard,
  FileText,
  Gauge,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Calendar,
  MessageSquare,
  Wrench,
  ClipboardList,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// Date reale din /api/portal/chitante (G-BLOC-021 — eliminat mock-ul demo).
interface Chitanta {
  id: string
  numar: number
  luna: number
  an: number
  sumaTotal: number
  sumaRamasa: number
  status: string
  dataScadenta: string
  apartament: string
  asociatie: string
}

const LUNI = ['', 'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie']

function isPaid(status: string) {
  return ['PLATIT', 'PLATITA', 'PAID', 'CONFIRMED'].includes((status || '').toUpperCase())
}

export default function PortalHomePage() {
  const { data: session } = useSession()
  const [chitante, setChitante] = useState<Chitanta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/portal/chitante')
      .then(r => (r.ok ? r.json() : []))
      .then(d => setChitante(Array.isArray(d) ? d : []))
      .catch(() => setChitante([]))
      .finally(() => setLoading(false))
  }, [])

  const firstName = (session?.user?.name || '').split(' ')[0] || 'locatar'
  const apartament = chitante[0]?.apartament
  const asociatie = chitante[0]?.asociatie
  const neplatite = chitante.filter(c => !isPaid(c.status) && c.sumaRamasa > 0)
  const dePlata = neplatite.reduce((s, c) => s + c.sumaRamasa, 0)
  const restanta = neplatite.reduce((s, c) => s + (c.sumaRamasa), 0)
  const hasDebt = dePlata > 0
  const recente = chitante.slice(0, 3)
  const urmatoareaScadenta = neplatite[0]?.dataScadenta

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bună, {firstName}!</h1>
        <p className="text-gray-500">
          {apartament ? `Apartament ${apartament}` : 'Portal locatar'}
          {asociatie ? ` • ${asociatie}` : ''}
        </p>
      </div>

      {/* Balance Card */}
      <Card className={hasDebt ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sold curent</p>
              <p className={`text-3xl font-bold ${hasDebt ? 'text-orange-600' : 'text-green-600'}`}>
                {hasDebt ? `-${dePlata.toFixed(2)}` : '0'} lei
              </p>
              {hasDebt && urmatoareaScadenta && (
                <p className="text-sm text-gray-500 mt-1">
                  Scadență: {new Date(urmatoareaScadenta).toLocaleDateString('ro-RO')}
                </p>
              )}
            </div>
            {hasDebt ? (
              <Link href="/portal/payments">
                <Button size="lg" className="bg-orange-600 hover:bg-orange-700">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Plătește acum
                </Button>
              </Link>
            ) : (
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
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Chitanțe neplătite</p>
                <p className="font-semibold">{neplatite.length}</p>
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
                <p className="text-sm text-gray-500">Total de plată</p>
                <p className="font-semibold">{restanta.toFixed(2)} lei</p>
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
            <Link href="/portal/payments" className="text-blue-600 text-sm font-medium">
              Vezi toate
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {recente.length === 0 && (
            <p className="text-sm text-gray-500">Nu există chitanțe încă.</p>
          )}
          {recente.map((chitanta) => (
            <div
              key={chitanta.id}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center border">
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="font-medium">{LUNI[chitanta.luna] || chitanta.luna} {chitanta.an}</p>
                  <p className="text-sm text-gray-500">
                    {isPaid(chitanta.status)
                      ? 'Plătit'
                      : `Scadență ${new Date(chitanta.dataScadenta).toLocaleDateString('ro-RO')}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-semibold">{chitanta.sumaTotal.toFixed(2)} lei</p>
                  <StatusBadge paid={isPaid(chitanta.status)} />
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Contoare — fără date demo; doar CTA real către trimiterea indexilor */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Indexuri contoare</CardTitle>
            <Link href="/portal/contoare" className="text-blue-600 text-sm font-medium">
              Trimite indexi
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
            <div className="flex items-start gap-2">
              <Gauge className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Trimite indexii contoarelor tale
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Poți fotografia contoarele direct din aplicație.
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

function StatusBadge({ paid }: { paid: boolean }) {
  if (paid) {
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
