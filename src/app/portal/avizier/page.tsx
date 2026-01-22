'use client'

import { useEffect, useState } from 'react'
import {
  FileText,
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface AvizierData {
  asociatie: {
    nume: string
    adresa: string
  }
  luna: number
  an: number
  categoriiCheltuieli: string[]
  apartamente: Array<{
    numar: string
    scara?: string
    proprietar?: string
    cheltuieli: Record<string, number>
    totalIntretinere: number
    restanta: number
    penalizari: number
    fonduri: number
    total: number
  }>
  totaluri: {
    categorii: Record<string, number>
    intretinere: number
    restante: number
    penalizari: number
    fonduri: number
    total: number
  }
}

const months = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
]

export default function PortalAvizierPage() {
  const [data, setData] = useState<AvizierData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    fetchAvizier()
  }, [selectedMonth, selectedYear])

  async function fetchAvizier() {
    setLoading(true)
    try {
      const res = await fetch(`/api/portal/avizier?luna=${selectedMonth}&an=${selectedYear}`)
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error('Error fetching avizier:', err)
    } finally {
      setLoading(false)
    }
  }

  const prevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  const nextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1)
      setSelectedYear(selectedYear + 1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Link href="/portal" className="flex items-center text-blue-600 text-sm">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Înapoi
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nu există date pentru avizier
            </h3>
            <p className="text-gray-500">
              Avizierul va fi disponibil după ce administratorul generează chitanțele lunare.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/portal" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Avizier</h1>
            <p className="text-sm text-gray-500">{data.asociatie.nume}</p>
          </div>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-center gap-3">
        <Button variant="outline" size="sm" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium min-w-[140px] text-center">
          {months[selectedMonth - 1]} {selectedYear}
        </span>
        <Button variant="outline" size="sm" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Sumar Cheltuieli
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600 font-medium">Total Întreținere</p>
              <p className="text-lg font-bold text-blue-900">
                {data.totaluri.intretinere.toLocaleString('ro-RO')} lei
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="text-xs text-orange-600 font-medium">Total Restanțe</p>
              <p className="text-lg font-bold text-orange-900">
                {data.totaluri.restante.toLocaleString('ro-RO')} lei
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-xs text-red-600 font-medium">Total Penalizări</p>
              <p className="text-lg font-bold text-red-900">
                {data.totaluri.penalizari.toLocaleString('ro-RO')} lei
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-green-600 font-medium">Total General</p>
              <p className="text-lg font-bold text-green-900">
                {data.totaluri.total.toLocaleString('ro-RO')} lei
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expense Categories */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Defalcare pe Categorii</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(data.totaluri.categorii).map(([categorie, suma]) => (
              <div key={categorie} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-700">{categorie}</span>
                <span className="font-semibold text-sm">{suma.toLocaleString('ro-RO')} lei</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Apartments Table - Simplified for Mobile */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Defalcare pe Apartamente</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Apt.</th>
                  <th className="px-3 py-2 text-right font-semibold">Întreț.</th>
                  <th className="px-3 py-2 text-right font-semibold">Rest.</th>
                  <th className="px-3 py-2 text-right font-semibold bg-green-100">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.apartamente.map((apt, idx) => (
                  <tr key={apt.numar} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 font-medium">{apt.numar}</td>
                    <td className="px-3 py-2 text-right">{apt.totalIntretinere.toLocaleString('ro-RO')}</td>
                    <td className="px-3 py-2 text-right text-orange-600">
                      {apt.restanta > 0 ? apt.restanta.toLocaleString('ro-RO') : '-'}
                    </td>
                    <td className="px-3 py-2 text-right font-bold bg-green-50">
                      {apt.total.toLocaleString('ro-RO')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-200 font-bold">
                <tr>
                  <td className="px-3 py-2">TOTAL</td>
                  <td className="px-3 py-2 text-right">{data.totaluri.intretinere.toLocaleString('ro-RO')}</td>
                  <td className="px-3 py-2 text-right text-orange-600">{data.totaluri.restante.toLocaleString('ro-RO')}</td>
                  <td className="px-3 py-2 text-right bg-green-100">{data.totaluri.total.toLocaleString('ro-RO')}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-gray-400 text-center">
        Toate sumele sunt exprimate în lei (RON)
      </p>
    </div>
  )
}
