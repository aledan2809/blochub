'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  Receipt,
  Megaphone,
  Download,
  Eye,
  Calendar,
  Loader2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Document {
  id: string
  tip: string
  titlu: string
  descriere?: string
  fisierUrl: string
  fisierNume: string
  createdAt: string
}

interface Factura {
  id: string
  tip: string
  descriere?: string
  suma: number
  dataFactura: string
  nrFactura?: string
  imagineUrl: string
  luna: number
  an: number
  furnizor?: { nume: string }
}

interface Anunt {
  id: string
  titlu: string
  continut: string
  important: boolean
  createdAt: string
}

const tipDocLabels: Record<string, string> = {
  AVG: 'Adunare Generală',
  BUGET: 'Buget',
  REGULAMENT: 'Regulament',
  CONTRACT: 'Contract',
  FACTURA: 'Factură',
  ALTELE: 'Altele',
}

const tipCheltuialaLabels: Record<string, string> = {
  APA_RECE: 'Apă rece',
  APA_CALDA: 'Apă caldă',
  CANALIZARE: 'Canalizare',
  GAZ: 'Gaz',
  CURENT_COMUN: 'Curent comun',
  CALDURA: 'Căldură',
  ASCENSOR: 'Ascensor',
  CURATENIE: 'Curățenie',
  GUNOI: 'Gunoi',
  FOND_RULMENT: 'Fond rulment',
  FOND_REPARATII: 'Fond reparații',
  ADMINISTRARE: 'Administrare',
  ALTE_CHELTUIELI: 'Alte cheltuieli',
}

const months = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
]

export default function DocumentePage() {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'documente' | 'facturi' | 'anunturi'>('documente')
  const [documente, setDocumente] = useState<Document[]>([])
  const [facturiGrupate, setFacturiGrupate] = useState<Record<string, Factura[]>>({})
  const [anunturi, setAnunturi] = useState<Anunt[]>([])
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const res = await fetch('/api/portal/documente')
      if (res.ok) {
        const data = await res.json()
        setDocumente(data.documente || [])
        setFacturiGrupate(data.facturiGrupate || {})
        setAnunturi(data.anunturi || [])

        // Auto-expand current month
        const now = new Date()
        const currentKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
        setExpandedMonths(new Set([currentKey]))
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  function toggleMonth(key: string) {
    const newExpanded = new Set(expandedMonths)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedMonths(newExpanded)
  }

  function formatMonthKey(key: string): string {
    const [an, luna] = key.split('-')
    return `${months[parseInt(luna) - 1]} ${an}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/portal" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documente</h1>
          <p className="text-gray-500">Acte oficiale și facturi asociație</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b overflow-x-auto">
        <button
          onClick={() => setActiveTab('documente')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap',
            activeTab === 'documente'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          <FileText className="h-4 w-4" />
          Documente oficiale
        </button>
        <button
          onClick={() => setActiveTab('facturi')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap',
            activeTab === 'facturi'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          <Receipt className="h-4 w-4" />
          Facturi furnizori
        </button>
        <button
          onClick={() => setActiveTab('anunturi')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap',
            activeTab === 'anunturi'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          <Megaphone className="h-4 w-4" />
          Anunțuri
        </button>
      </div>

      {/* Documente Tab */}
      {activeTab === 'documente' && (
        <div className="space-y-3">
          {documente.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nu există documente încărcate</p>
            </div>
          ) : (
            documente.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-lg border p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{doc.titlu}</p>
                    <p className="text-sm text-gray-500">
                      {tipDocLabels[doc.tip] || doc.tip} • {new Date(doc.createdAt).toLocaleDateString('ro-RO')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewUrl(doc.fisierUrl)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <a href={doc.fisierUrl} download={doc.fisierNume}>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Facturi Tab */}
      {activeTab === 'facturi' && (
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Transparență totală:</strong> Aici poți vedea facturile originale de la furnizori care stau la baza calculului întreținerii tale.
            </p>
          </div>

          {Object.keys(facturiGrupate).length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center">
              <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nu există facturi scanate</p>
              <p className="text-sm text-gray-400 mt-1">
                Administratorul nu a încărcat încă imaginile facturilor
              </p>
            </div>
          ) : (
            Object.entries(facturiGrupate)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([key, facturi]) => (
                <div key={key} className="bg-white rounded-lg border overflow-hidden">
                  <button
                    onClick={() => toggleMonth(key)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <span className="font-medium">{formatMonthKey(key)}</span>
                      <span className="text-sm text-gray-500">
                        ({facturi.length} facturi)
                      </span>
                    </div>
                    {expandedMonths.has(key) ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </button>

                  {expandedMonths.has(key) && (
                    <div className="border-t divide-y">
                      {facturi.map((factura) => (
                        <div
                          key={factura.id}
                          className="p-4 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Receipt className="h-5 w-5 text-gray-500" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {tipCheltuialaLabels[factura.tip] || factura.tip}
                              </p>
                              <p className="text-sm text-gray-500">
                                {factura.furnizor?.nume || 'Fără furnizor'}
                                {factura.nrFactura && ` • Nr. ${factura.nrFactura}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">
                              {factura.suma.toLocaleString('ro-RO')} lei
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPreviewUrl(factura.imagineUrl)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Vezi
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
          )}
        </div>
      )}

      {/* Anunturi Tab */}
      {activeTab === 'anunturi' && (
        <div className="space-y-3">
          {anunturi.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center">
              <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nu există anunțuri</p>
            </div>
          ) : (
            anunturi.map((anunt) => (
              <div
                key={anunt.id}
                className={cn(
                  'bg-white rounded-lg border p-4',
                  anunt.important && 'border-red-200 bg-red-50'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {anunt.important && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                          Important
                        </span>
                      )}
                      <span className="text-sm text-gray-500">
                        {new Date(anunt.createdAt).toLocaleDateString('ro-RO')}
                      </span>
                    </div>
                    <h3 className="font-medium mt-1">{anunt.titlu}</h3>
                    <p className="text-gray-600 mt-2 whitespace-pre-wrap">{anunt.continut}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-auto bg-white rounded-lg">
            <div className="sticky top-0 flex items-center justify-between p-3 bg-white border-b">
              <span className="font-medium">Previzualizare document</span>
              <div className="flex gap-2">
                <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Deschide
                  </Button>
                </a>
                <Button variant="outline" size="sm" onClick={() => setPreviewUrl(null)}>
                  Închide
                </Button>
              </div>
            </div>
            <div className="p-4">
              {previewUrl.endsWith('.pdf') ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[70vh]"
                  title="Document preview"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Document"
                  className="max-w-full h-auto"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
