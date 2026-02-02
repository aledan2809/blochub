'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Building2,
  MapPin,
  Phone,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Users,
  Banknote,
  Calendar,
  Shield,
  Receipt,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AnafFirma {
  cui: number
  denumire: string
  adresa: string
  codPostal: string | null
  judet: string
  localitate: string
  telefon: string | null
  nrRegCom: string | null
  codCAEN: string | null
  stareInregistrare: string
  dataInregistrare: string | null
  organFiscal: string | null
  formaJuridica: string | null
  formaProprietate: string | null
  platitorTVA: boolean
  perioadeVAT: Array<{
    data_inceput_ScpTVA: string
    data_sfarsit_ScpTVA: string
    mesaj_ScpTVA: string
  }>
  tvaIncasare: boolean
  dataInceputTvaInc: string | null
  splitTVA: boolean
  dataInceputSplitTVA: string | null
  esteInactiv: boolean
  dataInactivare: string | null
  dataReactivare: string | null
  dataRadiere: string | null
  eFactura: boolean
  iban: string | null
}

interface BilantData {
  an: number
  caen: number
  caenDenumire: string
  activeImobilizate: number
  activeCirculante: number
  stocuri: number
  creante: number
  casaBanca: number
  datorii: number
  capitaluriProprii: number
  capitalSocial: number
  cifraAfaceriNeta: number
  venituriTotale: number
  cheltuieliTotale: number
  profitBrut: number
  profitNet: number
  nrMediuSalariati: number
}

interface AnafVerificationModalProps {
  cui: string
  onClose: () => void
  onAutoFill?: (data: AnafFirma) => void
}

export function AnafVerificationModal({ cui, onClose, onAutoFill }: AnafVerificationModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [firma, setFirma] = useState<AnafFirma | null>(null)
  const [bilant, setBilant] = useState<BilantData | null>(null)
  const [riscuri, setRiscuri] = useState<string[]>([])
  const [avertismente, setAvertismente] = useState<string[]>([])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/verificare-anaf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cui })
        })

        const data = await res.json()

        if (res.ok && data.found) {
          setFirma(data.firma)
          setBilant(data.bilant)
          setRiscuri(data.riscuri || [])
          setAvertismente(data.avertismente || [])
        } else {
          setError(data.message || data.error || 'Nu s-au găsit date pentru acest CUI')
        }
      } catch (err) {
        console.error('ANAF verification error:', err)
        setError('Eroare la comunicarea cu ANAF. Încercați din nou.')
      } finally {
        setLoading(false)
      }
    }

    if (cui) {
      fetchData()
    }
  }, [cui])

  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '-'
    return num.toLocaleString('ro-RO')
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    try {
      return new Date(date).toLocaleDateString('ro-RO')
    } catch {
      return date
    }
  }

  // Determină nivelul de risc general
  const getRiskLevel = () => {
    if (riscuri.length > 0) return 'high'
    if (avertismente.length > 0) return 'medium'
    return 'low'
  }

  const riskLevel = getRiskLevel()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl w-full max-w-2xl mx-4 shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={cn(
          "px-6 py-4 border-b flex items-center justify-between",
          riskLevel === 'high' && "bg-red-50",
          riskLevel === 'medium' && "bg-amber-50",
          riskLevel === 'low' && "bg-green-50"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              riskLevel === 'high' && "bg-red-100",
              riskLevel === 'medium' && "bg-amber-100",
              riskLevel === 'low' && "bg-green-100"
            )}>
              <Shield className={cn(
                "h-5 w-5",
                riskLevel === 'high' && "text-red-600",
                riskLevel === 'medium' && "text-amber-600",
                riskLevel === 'low' && "text-green-600"
              )} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Verificare ANAF</h2>
              <p className="text-sm text-gray-500">CUI: {cui}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-600">Se încarcă datele din ANAF...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
              <p className="text-gray-700 font-medium">{error}</p>
              <p className="text-sm text-gray-500 mt-2">Verificați dacă CUI-ul este corect</p>
            </div>
          ) : firma && (
            <div className="space-y-6">
              {/* Risk alerts */}
              {riscuri.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-red-800">Riscuri majore identificate</p>
                      <ul className="mt-2 space-y-1">
                        {riscuri.map((risc, i) => (
                          <li key={i} className="text-sm text-red-700 flex items-center gap-2">
                            <span className="h-1.5 w-1.5 bg-red-500 rounded-full" />
                            {risc}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {avertismente.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-amber-800">Semnale de atenție</p>
                      <ul className="mt-2 space-y-1">
                        {avertismente.map((av, i) => (
                          <li key={i} className="text-sm text-amber-700 flex items-center gap-2">
                            <span className="h-1.5 w-1.5 bg-amber-500 rounded-full" />
                            {av}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {riscuri.length === 0 && avertismente.length === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="font-medium text-green-800">Nu s-au identificat riscuri sau avertismente</p>
                  </div>
                </div>
              )}

              {/* Company Info */}
              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold">{firma.denumire}</h3>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">CUI</p>
                    <p className="font-medium">{firma.cui}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Nr. Reg. Com.</p>
                    <p className="font-medium">{firma.nrRegCom || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">CAEN Principal</p>
                    <p className="font-medium">{firma.codCAEN || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Stare</p>
                    <p className={cn(
                      "font-medium",
                      firma.esteInactiv ? "text-red-600" : "text-green-600"
                    )}>
                      {firma.esteInactiv ? 'INACTIV' : firma.stareInregistrare || 'ACTIV'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Adresa</p>
                    <p className="font-medium flex items-start gap-1">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      {firma.adresa || '-'}
                    </p>
                  </div>
                  {firma.telefon && (
                    <div>
                      <p className="text-gray-500">Telefon</p>
                      <p className="font-medium flex items-center gap-1">
                        <Phone className="h-4 w-4 text-gray-400" />
                        {firma.telefon}
                      </p>
                    </div>
                  )}
                  {firma.dataInregistrare && (
                    <div>
                      <p className="text-gray-500">Data înregistrării</p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatDate(firma.dataInregistrare)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* VAT Status */}
              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold">Status TVA</h3>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Plătitor TVA</span>
                    {firma.platitorTVA ? (
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        <CheckCircle className="h-4 w-4" /> DA
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-500 font-medium">
                        <XCircle className="h-4 w-4" /> NU
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">TVA la încasare</span>
                    {firma.tvaIncasare ? (
                      <span className="flex items-center gap-1 text-amber-600 font-medium">
                        <AlertTriangle className="h-4 w-4" /> DA
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        <CheckCircle className="h-4 w-4" /> NU
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Split TVA</span>
                    {firma.splitTVA ? (
                      <span className="flex items-center gap-1 text-blue-600 font-medium">
                        <CheckCircle className="h-4 w-4" /> DA
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-500 font-medium">
                        <XCircle className="h-4 w-4" /> NU
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">RO e-Factura</span>
                    {firma.eFactura ? (
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        <CheckCircle className="h-4 w-4" /> DA
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-500 font-medium">
                        <XCircle className="h-4 w-4" /> NU
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Financial Data */}
              {bilant && (
                <div className="bg-white border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-emerald-600" />
                        <h3 className="font-semibold">Situație financiară ({bilant.an})</h3>
                      </div>
                      {bilant.caenDenumire && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          CAEN: {bilant.caen}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {/* Profit/Pierdere */}
                      <div className={cn(
                        "p-3 rounded-lg",
                        (bilant.profitNet || 0) >= 0 ? "bg-green-50" : "bg-red-50"
                      )}>
                        <div className="flex items-center gap-2 mb-1">
                          {(bilant.profitNet || 0) >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm text-gray-600">Profit net</span>
                        </div>
                        <p className={cn(
                          "text-lg font-bold",
                          (bilant.profitNet || 0) >= 0 ? "text-green-700" : "text-red-700"
                        )}>
                          {formatNumber(bilant.profitNet)} lei
                        </p>
                      </div>

                      {/* Cifra de afaceri */}
                      <div className="p-3 rounded-lg bg-blue-50">
                        <div className="flex items-center gap-2 mb-1">
                          <Banknote className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-gray-600">Venituri totale</span>
                        </div>
                        <p className="text-lg font-bold text-blue-700">
                          {formatNumber(bilant.venituriTotale)} lei
                        </p>
                      </div>

                      {/* Nr. angajați */}
                      <div className="p-3 rounded-lg bg-purple-50">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="h-4 w-4 text-purple-600" />
                          <span className="text-sm text-gray-600">Nr. salariați</span>
                        </div>
                        <p className="text-lg font-bold text-purple-700">
                          {bilant.nrMediuSalariati || 0}
                        </p>
                      </div>
                    </div>

                    {/* More details */}
                    <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Active imobilizate</span>
                        <span className="font-medium">{formatNumber(bilant.activeImobilizate)} lei</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Active circulante</span>
                        <span className="font-medium">{formatNumber(bilant.activeCirculante)} lei</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Casa și conturi</span>
                        <span className="font-medium">{formatNumber(bilant.casaBanca)} lei</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Creanțe</span>
                        <span className="font-medium">{formatNumber(bilant.creante)} lei</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Datorii</span>
                        <span className={cn(
                          "font-medium",
                          (bilant.datorii || 0) > (bilant.capitaluriProprii || 0) * 2 ? "text-amber-600" : ""
                        )}>
                          {formatNumber(bilant.datorii)} lei
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Capitaluri proprii</span>
                        <span className={cn(
                          "font-medium",
                          (bilant.capitaluriProprii || 0) < 0 ? "text-red-600" : ""
                        )}>
                          {formatNumber(bilant.capitaluriProprii)} lei
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Capital social</span>
                        <span className="font-medium">{formatNumber(bilant.capitalSocial)} lei</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Cheltuieli totale</span>
                        <span className="font-medium">{formatNumber(bilant.cheltuieliTotale)} lei</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* External links */}
              <div className="flex flex-wrap gap-2 text-sm">
                <a
                  href={`https://www.listafirme.ro/search.asp?q=${firma.cui}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  ListaFirme.ro
                </a>
                <a
                  href={`https://www.risco.ro/verifica-firma/${firma.cui}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  RisCo.ro
                </a>
                <a
                  href={`https://mfinante.gov.ro/apps/infocodfiscal.html?cod=${firma.cui}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  MFinanțe.gov.ro
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {firma && !loading && !error && (
          <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Închide
            </Button>
            {onAutoFill && (
              <Button onClick={() => { onAutoFill(firma); onClose(); }}>
                Completează datele
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
