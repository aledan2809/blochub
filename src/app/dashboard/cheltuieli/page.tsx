'use client'

import { useEffect, useState } from 'react'
import {
  Plus,
  Search,
  Loader2,
  Receipt,
  Camera,
  Sparkles,
  Upload,
  CheckCircle,
  Pencil,
  Trash2,
  X,
  Building2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Furnizor {
  id: string
  nume: string
  cui: string | null
  contBancar: string | null
}

interface Cheltuiala {
  id: string
  tip: string
  descriere: string | null
  suma: number
  dataFactura: string
  nrFactura: string | null
  luna: number
  an: number
  modRepartizare: string
  furnizorId: string | null
  furnizor?: Furnizor | null
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

const modRepartizareLabels: Record<string, string> = {
  CONSUM: 'Pe consum',
  COTA_INDIVIZA: 'Cotă indiviză',
  PERSOANE: 'Pe persoane',
  APARTAMENT: 'Fix/apartament',
  MANUAL: 'Manual',
}

export default function CheltuieliPage() {
  const [cheltuieli, setCheltuieli] = useState<Cheltuiala[]>([])
  const [furnizori, setFurnizori] = useState<Furnizor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCheltuiala, setEditingCheltuiala] = useState<Cheltuiala | null>(null)
  const [asociatieId, setAsociatieId] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const fetchData = async () => {
    try {
      const statsRes = await fetch('/api/dashboard/stats')
      const statsData = await statsRes.json()

      if (!statsData.hasAsociatie) {
        setLoading(false)
        return
      }

      setAsociatieId(statsData.asociatie.id)

      // Fetch cheltuieli
      const res = await fetch(
        `/api/cheltuieli?asociatieId=${statsData.asociatie.id}&luna=${selectedMonth}&an=${selectedYear}`
      )
      const data = await res.json()
      setCheltuieli(data.cheltuieli || [])

      // Fetch furnizori
      const furnizoriRes = await fetch(`/api/furnizori?asociatieId=${statsData.asociatie.id}`)
      if (furnizoriRes.ok) {
        const furnizoriData = await furnizoriRes.json()
        setFurnizori(furnizoriData.furnizori || [])
      }
    } catch (err) {
      console.error('Error fetching expenses:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedMonth, selectedYear])

  const handleDelete = async (id: string) => {
    if (!confirm('Sigur doriți să ștergeți această cheltuială?')) return

    try {
      const res = await fetch(`/api/cheltuieli?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setCheltuieli(cheltuieli.filter(ch => ch.id !== id))
      }
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const totalCheltuieli = cheltuieli.reduce((sum, ch) => sum + ch.suma, 0)

  const filteredCheltuieli = cheltuieli.filter(ch =>
    tipCheltuialaLabels[ch.tip]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ch.furnizor?.nume.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ch.descriere?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          <h1 className="text-2xl font-bold text-gray-900">Cheltuieli</h1>
          <p className="text-gray-500">
            {months[selectedMonth - 1]} {selectedYear} - Total: {totalCheltuieli.toLocaleString('ro-RO')} lei
          </p>
        </div>
        <Button onClick={() => { setEditingCheltuiala(null); setShowAddModal(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Adaugă Cheltuială
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Caută cheltuieli..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
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

      {/* Expenses List */}
      {filteredCheltuieli.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Niciun rezultat' : 'Nu există cheltuieli'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm
                ? 'Încearcă să modifici criteriile de căutare'
                : `Adaugă prima cheltuială pentru ${months[selectedMonth - 1]} ${selectedYear}`}
            </p>
            {!searchTerm && (
              <Button onClick={() => { setEditingCheltuiala(null); setShowAddModal(true) }}>
                <Plus className="h-4 w-4 mr-2" />
                Adaugă Cheltuială
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCheltuieli.map((ch) => (
            <Card
              key={ch.id}
              className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => { setEditingCheltuiala(ch); setShowAddModal(true) }}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Receipt className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{tipCheltuialaLabels[ch.tip] || ch.tip}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        {ch.furnizor ? (
                          <>
                            <span className="font-medium text-gray-700">{ch.furnizor.nume}</span>
                            {ch.furnizor.contBancar && (
                              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                IBAN
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                            Fără furnizor!
                          </span>
                        )}
                        {ch.nrFactura && <span>• Factura #{ch.nrFactura}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-lg">{ch.suma.toLocaleString('ro-RO')} lei</p>
                      <p className="text-sm text-gray-500">{modRepartizareLabels[ch.modRepartizare]}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); handleDelete(ch.id) }}
                      title="Șterge"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {ch.descriere && (
                  <p className="mt-2 text-sm text-gray-600 pl-14">{ch.descriere}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && asociatieId && (
        <CheltuialaModal
          asociatieId={asociatieId}
          luna={selectedMonth}
          an={selectedYear}
          furnizori={furnizori}
          editingCheltuiala={editingCheltuiala}
          onClose={() => { setShowAddModal(false); setEditingCheltuiala(null) }}
          onSuccess={(newCh) => {
            if (editingCheltuiala) {
              setCheltuieli(cheltuieli.map(ch => ch.id === newCh.id ? newCh : ch))
            } else {
              setCheltuieli([...cheltuieli, newCh])
            }
            setShowAddModal(false)
            setEditingCheltuiala(null)
            // Refresh furnizori list in case new one was added
            fetchData()
          }}
        />
      )}
    </div>
  )
}

function CheltuialaModal({
  asociatieId,
  luna,
  an,
  furnizori,
  editingCheltuiala,
  onClose,
  onSuccess,
}: {
  asociatieId: string
  luna: number
  an: number
  furnizori: Furnizor[]
  editingCheltuiala: Cheltuiala | null
  onClose: () => void
  onSuccess: (ch: Cheltuiala) => void
}) {
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [ocrSuccess, setOcrSuccess] = useState(false)
  const [showNewFurnizor, setShowNewFurnizor] = useState(false)
  const [verifyingAnaf, setVerifyingAnaf] = useState(false)
  const [anafResult, setAnafResult] = useState<{
    found: boolean
    firma?: {
      denumire: string
      adresa: string
      platitorTVA: boolean
      esteInactiv: boolean
      eFactura: boolean
      iban?: string | null
    }
    message?: string
  } | null>(null)
  const [formData, setFormData] = useState({
    tip: editingCheltuiala?.tip || 'APA_RECE',
    suma: editingCheltuiala?.suma?.toString() || '',
    descriere: editingCheltuiala?.descriere || '',
    nrFactura: editingCheltuiala?.nrFactura || '',
    modRepartizare: editingCheltuiala?.modRepartizare || 'COTA_INDIVIZA',
    furnizorId: editingCheltuiala?.furnizorId || '',
    // New furnizor fields
    furnizorNume: '',
    furnizorCui: '',
    furnizorIban: '',
  })

  const isEditing = !!editingCheltuiala

  // Verificare ANAF
  const handleVerifyAnaf = async () => {
    if (!formData.furnizorCui) {
      alert('Introdu CUI-ul pentru verificare')
      return
    }

    setVerifyingAnaf(true)
    setAnafResult(null)

    try {
      const res = await fetch('/api/verificare-anaf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cui: formData.furnizorCui })
      })

      const data = await res.json()

      if (!res.ok) {
        setAnafResult({ found: false, message: data.error || 'Eroare la verificare' })
        return
      }

      setAnafResult(data)

      // Auto-completează datele dacă firma a fost găsită
      if (data.found && data.firma) {
        setFormData(prev => ({
          ...prev,
          furnizorNume: data.firma.denumire || prev.furnizorNume,
          furnizorIban: data.firma.iban || prev.furnizorIban,
        }))
      }
    } catch (error) {
      console.error('ANAF verification error:', error)
      setAnafResult({ found: false, message: 'Eroare la comunicarea cu serverul' })
    } finally {
      setVerifyingAnaf(false)
    }
  }

  // OCR scan invoice
  const handleScanInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setScanning(true)
    setOcrSuccess(false)

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          resolve(result.split(',')[1])
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Send to OCR API
      const res = await fetch('/api/agents/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'factura',
          imageBase64: base64,
          asociatieId,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data) {
          // Check if furnizor exists
          const existingFurnizor = furnizori.find(
            f => f.nume.toLowerCase() === data.data.furnizor?.toLowerCase() ||
                 f.cui === data.data.cui
          )

          setFormData({
            tip: data.data.tipCheltuiala || 'ALTE_CHELTUIELI',
            suma: String(data.data.suma || ''),
            descriere: data.data.descriere || data.data.detaliiServicii?.join(', ') || '',
            nrFactura: data.data.numarFactura || '',
            modRepartizare: 'COTA_INDIVIZA',
            furnizorId: existingFurnizor?.id || '',
            furnizorNume: existingFurnizor ? '' : (data.data.furnizor || ''),
            furnizorCui: existingFurnizor ? '' : (data.data.cui || ''),
            furnizorIban: existingFurnizor ? '' : (data.data.iban || ''),
          })

          if (!existingFurnizor && data.data.furnizor) {
            setShowNewFurnizor(true)
          }

          setOcrSuccess(true)
        }
      } else {
        alert('Nu am putut citi factura. Completează manual.')
      }
    } catch (error) {
      console.error('OCR error:', error)
      alert('Eroare la scanarea facturii. Completează manual.')
    } finally {
      setScanning(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate furnizor
    if (!formData.furnizorId && !formData.furnizorNume) {
      alert('Furnizorul este obligatoriu!')
      return
    }

    // If new furnizor and no IBAN, warn (but still allow - IBAN required only for bank payments)
    if (showNewFurnizor && !formData.furnizorIban) {
      const confirm = window.confirm(
        'Nu ai completat IBAN-ul furnizorului. Fără IBAN nu vei putea face plăți bancare către acest furnizor. Continui?'
      )
      if (!confirm) return
    }

    setLoading(true)

    try {
      const url = isEditing ? `/api/cheltuieli?id=${editingCheltuiala.id}` : '/api/cheltuieli'
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tip: formData.tip,
          suma: parseFloat(formData.suma),
          descriere: formData.descriere || null,
          nrFactura: formData.nrFactura || null,
          modRepartizare: formData.modRepartizare,
          asociatieId,
          luna,
          an,
          dataFactura: new Date().toISOString(),
          furnizorId: formData.furnizorId || null,
          // New furnizor data
          furnizorNume: showNewFurnizor ? formData.furnizorNume : null,
          furnizorCui: showNewFurnizor ? formData.furnizorCui : null,
          furnizorIban: showNewFurnizor ? formData.furnizorIban : null,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Eroare la salvare')
      }

      const data = await res.json()
      onSuccess(data.cheltuiala)
    } catch (err) {
      alert('Eroare: ' + (err instanceof Error ? err.message : 'Necunoscută'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">
              {isEditing ? 'Editează Cheltuială' : 'Adaugă Cheltuială'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* OCR Scanner - only for new expenses */}
            {!isEditing && (
              <>
                <div className="mb-6">
                  {scanning ? (
                    <div className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-blue-400 bg-blue-50 rounded-xl">
                      <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
                      <span className="text-sm text-blue-600 font-medium">Se scanează factura cu AI...</span>
                    </div>
                  ) : ocrSuccess ? (
                    <div className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-green-400 bg-green-50 rounded-xl">
                      <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                      <span className="text-sm text-green-600 font-medium">Factură citită cu succes!</span>
                      <span className="text-xs text-green-500">Verifică datele de mai jos</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                        <Sparkles className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">Încarcă factura - scanăm cu AI</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <label
                          htmlFor="invoice-file"
                          className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
                        >
                          <Upload className="h-5 w-5 text-gray-400 mb-1" />
                          <span className="text-xs text-gray-600 font-medium">Încarcă fișier</span>
                          <input
                            id="invoice-file"
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={handleScanInvoice}
                            disabled={scanning}
                          />
                        </label>
                        <label
                          htmlFor="invoice-camera"
                          className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
                        >
                          <Camera className="h-5 w-5 text-gray-400 mb-1" />
                          <span className="text-xs text-gray-600 font-medium">Folosește camera</span>
                          <input
                            id="invoice-camera"
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={handleScanInvoice}
                            disabled={scanning}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">sau completează manual</span>
                  </div>
                </div>
              </>
            )}

            {/* Furnizor Selection - MANDATORY */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Furnizor * <span className="text-red-500 text-xs">(obligatoriu)</span>
              </label>

              {!showNewFurnizor ? (
                <div className="space-y-2">
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={formData.furnizorId}
                    onChange={(e) => setFormData({ ...formData, furnizorId: e.target.value })}
                    required={!showNewFurnizor}
                  >
                    <option value="">Selectează furnizor</option>
                    {furnizori.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nume} {f.contBancar ? '(IBAN)' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewFurnizor(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Adaugă furnizor nou
                  </button>
                </div>
              ) : (
                <div className="space-y-3 p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Furnizor nou</span>
                    <button
                      type="button"
                      onClick={() => { setShowNewFurnizor(false); setAnafResult(null) }}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Anulează
                    </button>
                  </div>

                  {/* CUI cu verificare ANAF */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      CUI / Cod Fiscal
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={formData.furnizorCui}
                        onChange={(e) => {
                          setFormData({ ...formData, furnizorCui: e.target.value.toUpperCase() })
                          setAnafResult(null)
                        }}
                        placeholder="RO12345678"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleVerifyAnaf}
                        disabled={verifyingAnaf || !formData.furnizorCui}
                        className="shrink-0"
                      >
                        {verifyingAnaf ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Building2 className="h-4 w-4 mr-1" />
                            ANAF
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Introdu CUI-ul și apasă ANAF pentru a completa automat datele
                    </p>
                  </div>

                  {/* Rezultat verificare ANAF */}
                  {anafResult && (
                    <div className={`p-3 rounded-lg ${anafResult.found ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      {anafResult.found && anafResult.firma ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-green-700">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="font-medium text-sm">Firmă găsită în baza ANAF</span>
                          </div>
                          <div className="text-sm text-gray-700">
                            <p className="font-medium">{anafResult.firma.denumire}</p>
                            <p className="text-xs text-gray-500">{anafResult.firma.adresa}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {anafResult.firma.platitorTVA && (
                              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                Plătitor TVA
                              </span>
                            )}
                            {anafResult.firma.eFactura && (
                              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                                e-Factura
                              </span>
                            )}
                            {anafResult.firma.esteInactiv && (
                              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                                INACTIV
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-700">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">{anafResult.message || 'Firma nu a fost găsită'}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Nume furnizor *
                    </label>
                    <Input
                      value={formData.furnizorNume}
                      onChange={(e) => setFormData({ ...formData, furnizorNume: e.target.value })}
                      placeholder="ex: ENEL Energie"
                      required={showNewFurnizor}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      IBAN <span className="text-orange-600">(necesar pentru plăți bancare)</span>
                    </label>
                    <Input
                      value={formData.furnizorIban}
                      onChange={(e) => setFormData({ ...formData, furnizorIban: e.target.value.toUpperCase() })}
                      placeholder="RO49AAAA1B31007593840000"
                      className="font-mono"
                    />
                    {!formData.furnizorIban && (
                      <p className="text-xs text-orange-600 mt-1">
                        Fără IBAN nu vei putea genera fișiere de plată bancară pentru acest furnizor
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tip cheltuială *
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.tip}
                onChange={(e) => setFormData({ ...formData, tip: e.target.value })}
              >
                {Object.entries(tipCheltuialaLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sumă (lei) *
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.suma}
                onChange={(e) => setFormData({ ...formData, suma: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mod repartizare
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.modRepartizare}
                onChange={(e) => setFormData({ ...formData, modRepartizare: e.target.value })}
              >
                {Object.entries(modRepartizareLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nr. Factură
              </label>
              <Input
                type="text"
                value={formData.nrFactura}
                onChange={(e) => setFormData({ ...formData, nrFactura: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descriere
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
                value={formData.descriere}
                onChange={(e) => setFormData({ ...formData, descriere: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Anulează
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEditing ? 'Salvează' : 'Adaugă')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
