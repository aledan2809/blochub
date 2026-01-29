'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Wallet,
  Plus,
  Search,
  Calendar,
  CreditCard,
  Banknote,
  ArrowUpRight,
  X,
  Check,
  AlertCircle,
  Trash2,
  Receipt
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAsociatie } from '@/contexts/AsociatieContext'

interface Plata {
  id: string
  suma: number
  dataPlata: string
  metodaPlata: 'CASH' | 'CARD' | 'TRANSFER' | 'ALTELE'
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED'
  referinta: string | null
  serieChitantaIncasare: string | null
  numarChitantaIncasare: number | null
  apartament: {
    numar: string
    scara: { numar: string } | null
  }
  chitanta: {
    numar: number
    luna: number
    an: number
    sumaTotal: number
  }
  user?: {
    name: string | null
    email: string
  } | null
}

interface Chitanta {
  id: string
  numar: number
  luna: number
  an: number
  sumaTotal: number
  status: string
  apartament: {
    numar: string
    scara?: { numar: string } | null
  }
}

interface Asociatie {
  id: string
  serieChitantier: string | null
  numarChitantierStart: number
  ultimulNumarChitanta: number
}

const metodaPlataLabels: Record<string, string> = {
  CASH: 'Numerar',
  CARD: 'Card',
  TRANSFER: 'Transfer bancar',
  ALTELE: 'Altele'
}

const metodaPlataIcons: Record<string, React.ReactNode> = {
  CASH: <Banknote className="h-4 w-4" />,
  CARD: <CreditCard className="h-4 w-4" />,
  TRANSFER: <ArrowUpRight className="h-4 w-4" />,
  ALTELE: <Wallet className="h-4 w-4" />
}

const statusColors: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-gray-100 text-gray-700'
}

const months = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
]

export default function IncasariPage() {
  const { currentAsociatie } = useAsociatie()
  const [plati, setPlati] = useState<Plata[]>([])
  const [chitante, setChitante] = useState<Chitanta[]>([])
  const [loading, setLoading] = useState(true)
  const [asociatieData, setAsociatieData] = useState<Asociatie | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [stats, setStats] = useState({ totalIncasat: 0, numarPlati: 0 })

  // Modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState({
    chitantaId: '',
    suma: '',
    metodaPlata: 'CASH',
    referinta: '',
    dataPlata: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    if (currentAsociatie?.id) {
      fetchData()
    }
  }, [selectedMonth, selectedYear, currentAsociatie?.id])

  const fetchData = async () => {
    if (!currentAsociatie?.id) return

    try {
      const [platiRes, chitRes] = await Promise.all([
        fetch(`/api/incasari?asociatieId=${currentAsociatie.id}&luna=${selectedMonth}&an=${selectedYear}`),
        fetch(`/api/chitante?asociatieId=${currentAsociatie.id}`)
      ])

      if (platiRes.ok) {
        const data = await platiRes.json()
        setPlati(data.plati || [])
        setAsociatieData(data.asociatie)
        setStats(data.stats || { totalIncasat: 0, numarPlati: 0 })
      }

      if (chitRes.ok) {
        const chitData = await chitRes.json()
        // Filter to only unpaid/partially paid
        const unpaid = (chitData.chitante || []).filter((c: Chitanta) =>
          ['GENERATA', 'TRIMISA', 'PARTIAL_PLATITA', 'RESTANTA'].includes(c.status)
        )
        setChitante(unpaid)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Next receipt number calculation
  const nextReceiptNumber = asociatieData
    ? (asociatieData.ultimulNumarChitanta || 0) + 1
    : 1

  const nextReceiptDisplay = asociatieData?.serieChitantier
    ? `${asociatieData.serieChitantier}-${String(nextReceiptNumber).padStart(6, '0')}`
    : `#${nextReceiptNumber}`

  const handleAdd = async () => {
    if (!formData.chitantaId || !formData.suma || !currentAsociatie?.id) return

    try {
      const res = await fetch('/api/incasari', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          asociatieId: currentAsociatie.id,
          suma: parseFloat(formData.suma)
        })
      })

      if (res.ok) {
        setShowAddModal(false)
        setFormData({
          chitantaId: '',
          suma: '',
          metodaPlata: 'CASH',
          referinta: '',
          dataPlata: new Date().toISOString().split('T')[0]
        })
        fetchData()
      }
    } catch (error) {
      console.error('Failed to add plata:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Sigur doriți să anulați această plată?')) return

    try {
      const res = await fetch(`/api/incasari?id=${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Failed to delete plata:', error)
    }
  }

  // Filter plati - memoized to avoid recalculation on every render
  const filtered = useMemo(() => {
    return plati.filter(p => {
      const term = searchTerm.toLowerCase()
      return (
        p.apartament.numar.toLowerCase().includes(term) ||
        p.referinta?.toLowerCase().includes(term) ||
        metodaPlataLabels[p.metodaPlata].toLowerCase().includes(term)
      )
    })
  }, [plati, searchTerm])

  // Auto-fill suma when chitanta selected
  const handleChitantaSelect = (chitantaId: string) => {
    const chitanta = chitante.find(c => c.id === chitantaId)
    if (chitanta) {
      // Calculate remaining amount
      const paidForThis = plati
        .filter(p => p.chitanta.numar === chitanta.numar)
        .reduce((sum, p) => sum + p.suma, 0)
      const remaining = chitanta.sumaTotal - paidForThis
      setFormData({
        ...formData,
        chitantaId,
        suma: remaining > 0 ? remaining.toString() : chitanta.sumaTotal.toString()
      })
    } else {
      setFormData({ ...formData, chitantaId })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="h-7 w-7 text-green-600" />
            Încasări
          </h1>
          <p className="text-gray-600 mt-1">
            {months[selectedMonth - 1]} {selectedYear}
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Înregistrează încasare
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Wallet className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalIncasat.toLocaleString('ro-RO')} lei
              </p>
              <p className="text-sm text-gray-500">Total încasat</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Check className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.numarPlati}</p>
              <p className="text-sm text-gray-500">Plăți confirmate</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{chitante.length}</p>
              <p className="text-sm text-gray-500">Chitanțe neachitate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Caută după apartament sau referință..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          >
            {months.map((month, i) => (
              <option key={i} value={i + 1}>{month}</option>
            ))}
          </select>
          <select
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {[2024, 2025, 2026].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Payments List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'Nu s-au găsit rezultate' : 'Nu există încasări'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm
              ? 'Încercați alte criterii de căutare'
              : `Înregistrați prima plată pentru ${months[selectedMonth - 1]} ${selectedYear}`}
          </p>
          {!searchTerm && (
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Înregistrează încasare
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Nr. Chitanță</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Apartament</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Factură</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Sumă</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Metodă</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Data</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((plata) => (
                  <tr key={plata.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-700">
                          {plata.serieChitantaIncasare
                            ? `${plata.serieChitantaIncasare}-${String(plata.numarChitantaIncasare).padStart(6, '0')}`
                            : `#${plata.numarChitantaIncasare || '-'}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        Apt. {plata.apartament.numar}
                      </div>
                      {plata.apartament.scara && (
                        <div className="text-xs text-gray-500">
                          Scara {plata.apartament.scara.numar}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        #{plata.chitanta.numar}
                      </div>
                      <div className="text-xs text-gray-500">
                        {months[plata.chitanta.luna - 1]} {plata.chitanta.an}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-green-600">
                        {plata.suma.toLocaleString('ro-RO')} lei
                      </div>
                      <div className="text-xs text-gray-500">
                        din {plata.chitanta.sumaTotal.toLocaleString('ro-RO')} lei
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {metodaPlataIcons[plata.metodaPlata]}
                        <span className="text-sm">{metodaPlataLabels[plata.metodaPlata]}</span>
                      </div>
                      {plata.referinta && (
                        <div className="text-xs text-gray-500">
                          {plata.referinta}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(plata.dataPlata).toLocaleDateString('ro-RO')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        statusColors[plata.status]
                      )}>
                        {plata.status === 'CONFIRMED' ? 'Confirmată' :
                          plata.status === 'PENDING' ? 'În așteptare' :
                            plata.status === 'FAILED' ? 'Eșuată' : 'Rambursată'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(plata.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Înregistrează încasare</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Next Receipt Number Display */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-green-600">Următorul număr chitanță</p>
                  <p className="text-xl font-bold text-green-700">{nextReceiptDisplay}</p>
                </div>
              </div>
              {!asociatieData?.serieChitantier && (
                <p className="text-xs text-orange-600 mt-2">
                  Configurați seria chitanțier în Setări Asociație pentru numerotare completă
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Factură de plătit *
                </label>
                <select
                  value={formData.chitantaId}
                  onChange={(e) => handleChitantaSelect(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selectează factură</option>
                  {chitante.map(ch => (
                    <option key={ch.id} value={ch.id}>
                      Apt. {ch.apartament.numar}{ch.apartament.scara ? ` (Sc. ${ch.apartament.scara.numar})` : ''} - #{ch.numar} ({months[ch.luna - 1]} {ch.an}) - {ch.sumaTotal.toLocaleString('ro-RO')} lei
                    </option>
                  ))}
                </select>
                {chitante.length === 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    Nu există facturi neachitate
                  </p>
                )}
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
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Metodă de plată *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(metodaPlataLabels).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormData({ ...formData, metodaPlata: value })}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors',
                        formData.metodaPlata === value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      {metodaPlataIcons[value]}
                      <span className="text-sm">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data plății
                </label>
                <Input
                  type="date"
                  value={formData.dataPlata}
                  onChange={(e) => setFormData({ ...formData, dataPlata: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Referință / Nr. document
                </label>
                <Input
                  value={formData.referinta}
                  onChange={(e) => setFormData({ ...formData, referinta: e.target.value })}
                  placeholder="ex: OP 12345 / Chitanță 001"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowAddModal(false)}
              >
                Anulează
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleAdd}
                disabled={!formData.chitantaId || !formData.suma}
              >
                <Receipt className="h-4 w-4 mr-2" />
                Emite chitanță
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
