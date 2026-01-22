'use client'

import { useEffect, useState } from 'react'
import {
  Plus,
  Search,
  Loader2,
  Receipt,
  Calendar,
  Building2,
  Camera,
  Sparkles,
  Upload,
  CheckCircle,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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
  furnizor?: {
    nume: string
  } | null
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
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [asociatieId, setAsociatieId] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

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
          `/api/cheltuieli?asociatieId=${statsData.asociatie.id}&luna=${selectedMonth}&an=${selectedYear}`
        )
        const data = await res.json()
        setCheltuieli(data.cheltuieli || [])
      } catch (err) {
        console.error('Error fetching expenses:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [selectedMonth, selectedYear])

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
        <Button onClick={() => setShowAddModal(true)}>
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
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adaugă Cheltuială
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCheltuieli.map((ch) => (
            <Card key={ch.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Receipt className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{tipCheltuialaLabels[ch.tip] || ch.tip}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        {ch.furnizor && <span>{ch.furnizor.nume}</span>}
                        {ch.nrFactura && <span>• Factura #{ch.nrFactura}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{ch.suma.toLocaleString('ro-RO')} lei</p>
                    <p className="text-sm text-gray-500">{modRepartizareLabels[ch.modRepartizare]}</p>
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

      {/* Add Modal */}
      {showAddModal && asociatieId && (
        <AddCheltuialaModal
          asociatieId={asociatieId}
          luna={selectedMonth}
          an={selectedYear}
          onClose={() => setShowAddModal(false)}
          onSuccess={(newCh) => {
            setCheltuieli([...cheltuieli, newCh])
            setShowAddModal(false)
          }}
        />
      )}
    </div>
  )
}

function AddCheltuialaModal({
  asociatieId,
  luna,
  an,
  onClose,
  onSuccess,
}: {
  asociatieId: string
  luna: number
  an: number
  onClose: () => void
  onSuccess: (ch: Cheltuiala) => void
}) {
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [ocrSuccess, setOcrSuccess] = useState(false)
  const [formData, setFormData] = useState({
    tip: 'APA_RECE',
    suma: '',
    descriere: '',
    nrFactura: '',
    modRepartizare: 'COTA_INDIVIZA',
    furnizorNume: '',
    furnizorCui: '',
  })

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
          resolve(result.split(',')[1]) // Remove data:image/... prefix
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
          // Auto-fill form with OCR data
          setFormData({
            tip: data.data.tipCheltuiala || 'ALTE_CHELTUIELI',
            suma: String(data.data.suma || ''),
            descriere: data.data.descriere || data.data.detaliiServicii?.join(', ') || '',
            nrFactura: data.data.numarFactura || '',
            modRepartizare: 'COTA_INDIVIZA',
            furnizorNume: data.data.furnizor || '',
            furnizorCui: data.data.cui || '',
          })
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
    setLoading(true)

    try {
      const res = await fetch('/api/cheltuieli', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          suma: parseFloat(formData.suma),
          asociatieId,
          luna,
          an,
          dataFactura: new Date().toISOString(),
        }),
      })

      if (!res.ok) throw new Error('Eroare la creare')

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
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Adaugă Cheltuială</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* OCR Scanner */}
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
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Adaugă'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
