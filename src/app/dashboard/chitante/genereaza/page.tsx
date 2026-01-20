'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  FileText,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Zap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface GenerationResult {
  success: boolean
  generated: number
  errors: string[]
  chitante?: Array<{
    apartament: string
    sumaTotal: number
  }>
}

export default function GenereazaChitantePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [asociatieId, setAsociatieId] = useState<string | null>(null)
  const [asociatieNume, setAsociatieNume] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [existingCount, setExistingCount] = useState(0)
  const [apartamenteCount, setApartamenteCount] = useState(0)
  const [cheltuieliCount, setCheltuieliCount] = useState(0)

  const months = [
    'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
  ]

  useEffect(() => {
    async function fetchData() {
      try {
        const statsRes = await fetch('/api/dashboard/stats')
        const statsData = await statsRes.json()

        if (!statsData.hasAsociatie) {
          router.push('/dashboard')
          return
        }

        setAsociatieId(statsData.asociatie.id)
        setAsociatieNume(statsData.asociatie.nume)
        setApartamenteCount(statsData.stats.totalApartamente)

        // Check existing invoices for selected month
        await checkExisting(statsData.asociatie.id, selectedMonth, selectedYear)
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [router])

  useEffect(() => {
    if (asociatieId) {
      checkExisting(asociatieId, selectedMonth, selectedYear)
    }
  }, [selectedMonth, selectedYear, asociatieId])

  async function checkExisting(asocId: string, luna: number, an: number) {
    try {
      const [chitanteRes, cheltuieliRes] = await Promise.all([
        fetch(`/api/chitante?asociatieId=${asocId}&luna=${luna}&an=${an}`),
        fetch(`/api/cheltuieli?asociatieId=${asocId}&luna=${luna}&an=${an}`)
      ])

      const chitanteData = await chitanteRes.json()
      const cheltuieliData = await cheltuieliRes.json()

      setExistingCount(chitanteData.chitante?.length || 0)
      setCheltuieliCount(cheltuieliData.cheltuieli?.length || 0)
    } catch (err) {
      console.error('Error checking existing:', err)
    }
  }

  async function handleGenerate() {
    if (!asociatieId) return

    setGenerating(true)
    setResult(null)

    try {
      const res = await fetch('/api/chitante/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asociatieId,
          luna: selectedMonth,
          an: selectedYear,
          save: true
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setResult({
          success: false,
          generated: 0,
          errors: [data.error || 'Eroare la generare']
        })
        return
      }

      setResult({
        success: true,
        generated: data.chitante?.length || 0,
        errors: [],
        chitante: data.chitante?.map((ch: { apartament: { numar: string }, sumaTotal: number }) => ({
          apartament: ch.apartament.numar,
          sumaTotal: ch.sumaTotal
        }))
      })

      // Update existing count
      setExistingCount(data.chitante?.length || 0)
    } catch (err) {
      setResult({
        success: false,
        generated: 0,
        errors: [err instanceof Error ? err.message : 'Eroare necunoscută']
      })
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <Link href="/dashboard/chitante" className="inline-flex items-center text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Înapoi la chitanțe
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Zap className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle>Generează Chitanțe</CardTitle>
              <CardDescription>{asociatieNume}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Month/Year Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Perioada de facturare
            </label>
            <div className="flex gap-3">
              <select
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                disabled={generating}
              >
                {months.map((month, i) => (
                  <option key={i} value={i + 1}>{month}</option>
                ))}
              </select>
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                disabled={generating}
              >
                {[2024, 2025, 2026].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Apartamente:</span>
              <span className="font-medium">{apartamenteCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Cheltuieli înregistrate:</span>
              <span className={`font-medium ${cheltuieliCount === 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {cheltuieliCount}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Chitanțe existente:</span>
              <span className={`font-medium ${existingCount > 0 ? 'text-blue-600' : ''}`}>
                {existingCount}
              </span>
            </div>
          </div>

          {/* Warnings */}
          {cheltuieliCount === 0 && (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Nu există cheltuieli</p>
                <p className="text-sm text-yellow-700">
                  Adaugă cheltuieli pentru {months[selectedMonth - 1]} {selectedYear} înainte de a genera chitanțe.
                </p>
                <Link href="/dashboard/cheltuieli">
                  <Button variant="outline" size="sm" className="mt-2">
                    Adaugă cheltuieli
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {existingCount > 0 && !result && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Chitanțe existente</p>
                <p className="text-sm text-blue-700">
                  Există deja {existingCount} chitanțe pentru această perioadă. Generarea va crea chitanțe noi doar pentru apartamentele fără chitanță.
                </p>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
              {result.success ? (
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      {result.generated > 0
                        ? `${result.generated} chitanțe generate cu succes!`
                        : 'Toate chitanțele există deja pentru această perioadă.'}
                    </p>
                    {result.generated > 0 && result.chitante && (
                      <div className="mt-2 text-sm text-green-700">
                        <p>Total facturat: {result.chitante.reduce((sum, ch) => sum + ch.sumaTotal, 0).toLocaleString('ro-RO')} lei</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Eroare la generare</p>
                    {result.errors.map((err, i) => (
                      <p key={i} className="text-sm text-red-700">{err}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Link href="/dashboard/chitante" className="flex-1">
              <Button variant="outline" className="w-full">
                {result?.success ? 'Vezi chitanțele' : 'Anulează'}
              </Button>
            </Link>
            <Button
              className="flex-1"
              onClick={handleGenerate}
              disabled={generating || apartamenteCount === 0}
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Se generează...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generează
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
