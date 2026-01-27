'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  Search,
  Loader2,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  Send,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Chitanta {
  id: string
  numar: number
  luna: number
  an: number
  sumaIntretinere: number
  sumaRestanta: number
  sumaPenalizare: number
  sumaFonduri: number
  sumaTotal: number
  status: string
  dataScadenta: string
  apartament: {
    numar: string
  }
}

const statusLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  GENERATA: { label: 'Generată', color: 'bg-gray-100 text-gray-700', icon: <FileText className="h-3 w-3" /> },
  TRIMISA: { label: 'Trimisă', color: 'bg-blue-100 text-blue-700', icon: <Send className="h-3 w-3" /> },
  PARTIAL_PLATITA: { label: 'Parțial plătită', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="h-3 w-3" /> },
  PLATITA: { label: 'Plătită', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-3 w-3" /> },
  RESTANTA: { label: 'Restanță', color: 'bg-red-100 text-red-700', icon: <XCircle className="h-3 w-3" /> },
}

export default function ChitantePage() {
  const [chitante, setChitante] = useState<Chitanta[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [asociatieId, setAsociatieId] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  useEffect(() => {
    async function fetchData() {
      try {
        const statsRes = await fetch('/api/dashboard/stats')
        const statsData = await statsRes.json()

        if (!statsData.hasAsociatie) {
          setLoading(false)
          return
        }

        setAsociatieId(statsData.asociatie.id)

        const res = await fetch(
          `/api/chitante?asociatieId=${statsData.asociatie.id}&luna=${selectedMonth}&an=${selectedYear}`
        )
        const data = await res.json()
        setChitante(data.chitante || [])
      } catch (err) {
        console.error('Error fetching invoices:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [selectedMonth, selectedYear])

  // Memoize filtered chitante to avoid recalculation on every render
  const filteredChitante = useMemo(() => {
    return chitante.filter(ch => {
      const matchesSearch = ch.apartament.numar.includes(searchTerm)
      const matchesStatus = statusFilter === 'ALL' || ch.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [chitante, searchTerm, statusFilter])

  // Memoize total sum calculation
  const totalSum = useMemo(() => {
    return filteredChitante.reduce((sum, ch) => sum + ch.sumaTotal, 0)
  }, [filteredChitante])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const months = [
    'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chitanțe</h1>
          <p className="text-gray-500">
            {months[selectedMonth - 1]} {selectedYear} - {filteredChitante.length} chitanțe ({totalSum.toLocaleString('ro-RO')} lei)
          </p>
        </div>
        <Link href="/dashboard/chitante/genereaza">
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Generează Chitanțe
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Caută după apartament..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Toate statusurile</option>
            {Object.entries(statusLabels).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          >
            {months.map((month, i) => (
              <option key={i} value={i + 1}>{month}</option>
            ))}
          </select>
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {[2024, 2025, 2026].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Invoices List */}
      {filteredChitante.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || statusFilter !== 'ALL' ? 'Niciun rezultat' : 'Nu există chitanțe'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Încearcă să modifici criteriile de căutare'
                : `Generează chitanțele pentru ${months[selectedMonth - 1]} ${selectedYear}`}
            </p>
            {!searchTerm && statusFilter === 'ALL' && (
              <Link href="/dashboard/chitante/genereaza">
                <Button>
                  <FileText className="h-4 w-4 mr-2" />
                  Generează Chitanțe
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Apt.</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Nr. Chitanță</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Întreținere</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Restanțe</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Penalizări</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Total</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {filteredChitante.map((ch) => {
                const status = statusLabels[ch.status] || statusLabels.GENERATA
                return (
                  <tr key={ch.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-blue-100 rounded flex items-center justify-center">
                          <span className="font-semibold text-blue-600 text-sm">{ch.apartament.numar}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">#{ch.numar}</td>
                    <td className="py-3 px-4 text-right">{ch.sumaIntretinere.toLocaleString('ro-RO')} lei</td>
                    <td className="py-3 px-4 text-right text-orange-600">
                      {ch.sumaRestanta > 0 ? `${ch.sumaRestanta.toLocaleString('ro-RO')} lei` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-red-600">
                      {ch.sumaPenalizare > 0 ? `${ch.sumaPenalizare.toLocaleString('ro-RO')} lei` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold">{ch.sumaTotal.toLocaleString('ro-RO')} lei</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        {status.icon}
                        {status.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" title="Descarcă PDF">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Trimite email">
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td colSpan={5} className="py-3 px-4 text-right">Total:</td>
                <td className="py-3 px-4 text-right">{totalSum.toLocaleString('ro-RO')} lei</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
