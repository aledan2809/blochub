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
  Receipt,
  User,
  UserPlus,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAsociatie } from '@/contexts/AsociatieContext'
import Link from 'next/link'

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
    sumaIntretinere: number
    sumaRestanta: number
    sumaPenalizare: number
    sumaFonduri: number
    sumaTotal: number
    plati?: { suma: number }[]
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
  plati?: { suma: number; status: string }[]
  apartament: {
    numar: string
    scara?: { numar: string } | null
  }
}

interface Apartament {
  id: string
  numar: string
  suprafata: number
  etaj: number | null
  numarPersoane: number
  scara: { id: string; numar: string } | null
  proprietar: { id: string; nume: string; telefon: string | null } | null
  chirias: { id: string; nume: string; telefon: string | null } | null
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
  const [apartamente, setApartamente] = useState<Apartament[]>([])
  const [loading, setLoading] = useState(true)
  const [asociatieData, setAsociatieData] = useState<Asociatie | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [stats, setStats] = useState({ totalIncasat: 0, numarPlati: 0 })

  // Modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedApartamentId, setSelectedApartamentId] = useState('')
  const [modalMonth, setModalMonth] = useState(new Date().getMonth() + 1)
  const [modalYear, setModalYear] = useState(new Date().getFullYear())
  const [formData, setFormData] = useState({
    chitantaId: '',
    suma: '',
    metodaPlata: 'CASH',
    referinta: '',
    dataPlata: new Date().toISOString().split('T')[0],
    // Bank transfer details
    numeOrdonator: '',
    dataExtras: '',
    explicatieExtras: ''
  })

  // Resident management
  const [selectedLocuitor, setSelectedLocuitor] = useState<'proprietar' | 'chirias' | ''>('')
  const [showAddLocuitor, setShowAddLocuitor] = useState(false)
  const [addLocuitorType, setAddLocuitorType] = useState<'proprietar' | 'chirias'>('proprietar')
  const [newLocuitor, setNewLocuitor] = useState({ nume: '', telefon: '', email: '' })
  const [savingLocuitor, setSavingLocuitor] = useState(false)

  useEffect(() => {
    if (currentAsociatie?.id) {
      fetchData()
    }
  }, [selectedMonth, selectedYear, currentAsociatie?.id])

  const fetchData = async () => {
    if (!currentAsociatie?.id) return

    setLoading(true)
    try {
      const [platiRes, chitRes, aptRes] = await Promise.all([
        fetch(`/api/incasari?asociatieId=${currentAsociatie.id}&luna=${selectedMonth}&an=${selectedYear}`),
        fetch(`/api/chitante?asociatieId=${currentAsociatie.id}`),
        fetch(`/api/apartamente?asociatieId=${currentAsociatie.id}`)
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

      if (aptRes.ok) {
        const aptData = await aptRes.json()
        setApartamente(aptData.apartamente || [])
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
    if (!selectedApartamentId || !formData.suma || !currentAsociatie?.id) return

    try {
      // Build referinta with bank details if transfer
      let referinta: string | null = formData.referinta || null
      if (formData.metodaPlata === 'TRANSFER') {
        const parts: string[] = []
        if (formData.numeOrdonator) parts.push(`Ordonator: ${formData.numeOrdonator}`)
        if (formData.explicatieExtras) parts.push(`Explicație: ${formData.explicatieExtras}`)
        if (formData.referinta) parts.push(formData.referinta)
        referinta = parts.length > 0 ? parts.join(' | ') : null
      }

      const res = await fetch('/api/incasari', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apartamentId: selectedApartamentId,
          chitantaId: formData.chitantaId || null,
          asociatieId: currentAsociatie.id,
          suma: parseFloat(formData.suma),
          metodaPlata: formData.metodaPlata,
          referinta,
          dataPlata: formData.dataPlata
        })
      })

      if (res.ok) {
        setShowAddModal(false)
        setSelectedApartamentId('')
        setFormData({
          chitantaId: '',
          suma: '',
          metodaPlata: 'CASH',
          referinta: '',
          dataPlata: new Date().toISOString().split('T')[0],
          numeOrdonator: '',
          dataExtras: '',
          explicatieExtras: ''
        })
        fetchData()
      } else {
        const error = await res.json()
        alert(error.error || 'Eroare la înregistrarea încasării')
      }
    } catch (error) {
      console.error('Failed to add plata:', error)
      alert('Eroare la înregistrarea încasării')
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

  // Get selected apartment
  const selectedApartament = apartamente.find(a => a.id === selectedApartamentId)

  // Get unpaid chitante for selected apartment filtered by modal month
  const chitanteForApartament = chitante.filter(c =>
    c.apartament.numar === selectedApartament?.numar &&
    c.apartament.scara?.numar === selectedApartament?.scara?.numar &&
    c.luna === modalMonth &&
    c.an === modalYear
  )

  // Calculate remaining balance for a chitanta (sumaTotal - already paid)
  const getRestant = (c: Chitanta) => {
    const platit = c.plati?.filter(p => p.status === 'CONFIRMED').reduce((sum, p) => sum + p.suma, 0) || 0
    return Math.max(0, c.sumaTotal - platit)
  }

  // Calculate total outstanding for apartment (for selected month)
  const totalRestant = chitanteForApartament.reduce((sum, c) => sum + getRestant(c), 0)

  // Get all months that have unpaid obligations (for month selector)
  const availableMonths = useMemo(() => {
    const monthSet = new Map<string, { luna: number; an: number; count: number; total: number }>()
    chitante.forEach(c => {
      const restant = getRestant(c)
      if (restant <= 0) return // skip fully paid
      const key = `${c.an}-${c.luna}`
      const existing = monthSet.get(key)
      if (existing) {
        existing.count++
        existing.total += restant
      } else {
        monthSet.set(key, { luna: c.luna, an: c.an, count: 1, total: restant })
      }
    })
    return Array.from(monthSet.values()).sort((a, b) => a.an - b.an || a.luna - b.luna)
  }, [chitante])

  // Handle apartment selection
  const handleApartamentSelect = (apartamentId: string) => {
    setSelectedApartamentId(apartamentId)
    setShowAddLocuitor(false)
    const apt = apartamente.find(a => a.id === apartamentId)
    if (apt) {
      // Find unpaid chitante for this apartment for selected month
      const aptChitante = chitante.filter(c =>
        c.apartament.numar === apt.numar &&
        c.apartament.scara?.numar === apt.scara?.numar &&
        c.luna === modalMonth &&
        c.an === modalYear
      )
      const total = aptChitante.reduce((sum, c) => sum + getRestant(c), 0)
      // Auto-fill with the first unpaid chitanta for this month
      const firstUnpaid = aptChitante[0]

      // Auto-select locuitor (prefer chirias over proprietar)
      if (apt.chirias) {
        setSelectedLocuitor('chirias')
      } else if (apt.proprietar) {
        setSelectedLocuitor('proprietar')
      } else {
        setSelectedLocuitor('')
      }

      setFormData({
        ...formData,
        chitantaId: firstUnpaid?.id || '',
        suma: total > 0 ? total.toFixed(2) : '',
        numeOrdonator: apt.chirias?.nume || apt.proprietar?.nume || ''
      })
    }
  }

  // Auto-fill suma when chitanta selected
  const handleChitantaSelect = (chitantaId: string) => {
    const chitanta = chitante.find(c => c.id === chitantaId)
    if (chitanta) {
      const remaining = getRestant(chitanta)
      setFormData({
        ...formData,
        chitantaId,
        suma: remaining > 0 ? remaining.toFixed(2) : ''
      })
    } else {
      setFormData({ ...formData, chitantaId })
    }
  }

  // Add new locuitor (proprietar or chirias)
  const handleAddLocuitor = async () => {
    if (!selectedApartament || !newLocuitor.nume.trim()) return

    setSavingLocuitor(true)
    try {
      const endpoint = addLocuitorType === 'proprietar' ? '/api/proprietari' : '/api/chiriasi'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nume: newLocuitor.nume.trim(),
          telefon: newLocuitor.telefon.trim() || null,
          email: newLocuitor.email.trim() || null,
          apartamentId: selectedApartament.id
        })
      })

      if (res.ok) {
        // Refresh apartamente data
        fetchData()
        setShowAddLocuitor(false)
        setNewLocuitor({ nume: '', telefon: '', email: '' })
        setSelectedLocuitor(addLocuitorType)
        // Update numeOrdonator in formData
        setFormData(prev => ({ ...prev, numeOrdonator: newLocuitor.nume.trim() }))
      } else {
        const error = await res.json()
        alert(error.error || 'Eroare la adăugarea locuitorului')
      }
    } catch (error) {
      console.error('Failed to add locuitor:', error)
      alert('Eroare la adăugarea locuitorului')
    } finally {
      setSavingLocuitor(false)
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
              <p className="text-sm text-gray-500">Obligații neachitate</p>
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
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-500">Apartament</th>
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-500">Luna</th>
                  <th className="px-3 py-3 text-right text-sm font-medium text-gray-500">Obligație curentă</th>
                  <th className="px-3 py-3 text-right text-sm font-medium text-gray-500">Penalizări</th>
                  <th className="px-3 py-3 text-right text-sm font-medium text-gray-500">Total datorat</th>
                  <th className="px-3 py-3 text-right text-sm font-medium text-gray-500">Sumă plătită</th>
                  <th className="px-3 py-3 text-right text-sm font-medium text-gray-500">Rest de plată</th>
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-500">Metodă / Data</th>
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-500">Nr. Chitanță</th>
                  <th className="px-3 py-3 text-right text-sm font-medium text-gray-500">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((plata) => {
                  const totalPlatit = plata.chitanta.plati?.reduce((sum, p) => sum + p.suma, 0) || 0
                  const restDePlata = plata.chitanta.sumaTotal - totalPlatit
                  const fmt = (v: number) => v.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

                  return (
                  <tr key={plata.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <div className="font-medium">
                        Apt. {plata.apartament.numar}
                      </div>
                      {plata.apartament.scara && (
                        <div className="text-xs text-gray-500">
                          Sc. {plata.apartament.scara.numar}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm">
                      {months[plata.chitanta.luna - 1]} {plata.chitanta.an}
                    </td>
                    <td className="px-3 py-3 text-right text-sm">
                      {fmt(plata.chitanta.sumaIntretinere)} lei
                    </td>
                    <td className="px-3 py-3 text-right text-sm">
                      {plata.chitanta.sumaPenalizare > 0 ? (
                        <span className="text-red-600 font-medium">{fmt(plata.chitanta.sumaPenalizare)} lei</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-sm">
                      {fmt(plata.chitanta.sumaTotal)} lei
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="font-semibold text-green-600">{fmt(plata.suma)} lei</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {restDePlata > 0.01 ? (
                        <span className="font-semibold text-orange-600">{fmt(restDePlata)} lei</span>
                      ) : (
                        <span className="text-green-600 font-medium">Achitată</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        {metodaPlataIcons[plata.metodaPlata]}
                        <span className="text-sm">{metodaPlataLabels[plata.metodaPlata]}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(plata.dataPlata).toLocaleDateString('ro-RO')}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {plata.serieChitantaIncasare ? (
                        <div className="flex items-center gap-1.5">
                          <Receipt className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-sm font-medium text-green-700">
                            {plata.serieChitantaIncasare}-{String(plata.numarChitantaIncasare).padStart(6, '0')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Fără chitanță</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
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
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Înregistrează încasare</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Step 0: Select Month for obligations */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Luna obligației de plată *
              </label>
              <div className="flex gap-2">
                <select
                  value={modalMonth}
                  onChange={(e) => {
                    setModalMonth(parseInt(e.target.value))
                    setSelectedApartamentId('')
                    setFormData(prev => ({ ...prev, chitantaId: '', suma: '' }))
                  }}
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {months.map((month, i) => (
                    <option key={i} value={i + 1}>{month}</option>
                  ))}
                </select>
                <select
                  value={modalYear}
                  onChange={(e) => {
                    setModalYear(parseInt(e.target.value))
                    setSelectedApartamentId('')
                    setFormData(prev => ({ ...prev, chitantaId: '', suma: '' }))
                  }}
                  className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {[2024, 2025, 2026].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              {availableMonths.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {availableMonths.map(m => (
                    <button
                      key={`${m.an}-${m.luna}`}
                      type="button"
                      onClick={() => {
                        setModalMonth(m.luna)
                        setModalYear(m.an)
                        setSelectedApartamentId('')
                        setFormData(prev => ({ ...prev, chitantaId: '', suma: '' }))
                      }}
                      className={cn(
                        'text-xs px-2 py-1 rounded-full border transition-colors',
                        modalMonth === m.luna && modalYear === m.an
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      )}
                    >
                      {months[m.luna - 1]} {m.an} ({m.count} apt, {m.total.toLocaleString('ro-RO')} lei)
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Next Receipt Number Display - only for CASH */}
            {formData.metodaPlata === 'CASH' && (
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
                    Configurați seria chitanțier în{' '}
                    <Link href="/dashboard/setari?tab=asociatie" target="_blank" className="font-medium underline hover:text-orange-700">
                      Setări Asociație →
                    </Link>
                  </p>
                )}
              </div>
            )}

            {/* Info for non-cash payments */}
            {formData.metodaPlata !== 'CASH' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    {metodaPlataIcons[formData.metodaPlata]}
                  </div>
                  <div>
                    <p className="text-sm text-blue-600">Plată fără chitanță</p>
                    <p className="text-xs text-blue-500 mt-1">
                      Chitanța se emite doar pentru plăți în numerar
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Step 1: Select Apartment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apartament *
                </label>
                <select
                  value={selectedApartamentId}
                  onChange={(e) => handleApartamentSelect(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selectează apartament</option>
                  {apartamente.map(apt => (
                    <option key={apt.id} value={apt.id}>
                      Apt. {apt.numar}{apt.scara ? ` (Sc. ${apt.scara.numar})` : ''} - {apt.chirias?.nume || apt.proprietar?.nume || 'Fără locuitor'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Show resident info when apartment selected */}
              {selectedApartament && (
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">Locuitor *</p>
                    {!showAddLocuitor && (
                      <button
                        type="button"
                        onClick={() => setShowAddLocuitor(true)}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <UserPlus className="h-3 w-3" />
                        Adaugă locuitor
                      </button>
                    )}
                  </div>

                  {/* Add new locuitor form */}
                  {showAddLocuitor ? (
                    <div className="space-y-3 p-3 bg-white rounded-lg border">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setAddLocuitorType('proprietar')}
                          className={cn(
                            'flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors',
                            addLocuitorType === 'proprietar'
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-200 hover:border-gray-300'
                          )}
                        >
                          Proprietar
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddLocuitorType('chirias')}
                          className={cn(
                            'flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors',
                            addLocuitorType === 'chirias'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300'
                          )}
                        >
                          Chiriaș
                        </button>
                      </div>
                      <Input
                        placeholder="Nume complet *"
                        value={newLocuitor.nume}
                        onChange={(e) => setNewLocuitor({ ...newLocuitor, nume: e.target.value })}
                        className="text-sm"
                      />
                      <Input
                        placeholder="Telefon"
                        value={newLocuitor.telefon}
                        onChange={(e) => setNewLocuitor({ ...newLocuitor, telefon: e.target.value })}
                        className="text-sm"
                      />
                      <Input
                        placeholder="Email"
                        type="email"
                        value={newLocuitor.email}
                        onChange={(e) => setNewLocuitor({ ...newLocuitor, email: e.target.value })}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setShowAddLocuitor(false)
                            setNewLocuitor({ nume: '', telefon: '', email: '' })
                          }}
                        >
                          Anulează
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="flex-1"
                          onClick={handleAddLocuitor}
                          disabled={savingLocuitor || !newLocuitor.nume.trim()}
                        >
                          {savingLocuitor ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Salvează'
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Existing locuitori selection */}
                      {(selectedApartament.proprietar || selectedApartament.chirias) ? (
                        <div className="space-y-2">
                          {selectedApartament.proprietar && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLocuitor('proprietar')
                                setFormData(prev => ({ ...prev, numeOrdonator: selectedApartament.proprietar!.nume }))
                              }}
                              className={cn(
                                'w-full flex items-center gap-3 p-2 rounded-lg border transition-colors text-left',
                                selectedLocuitor === 'proprietar'
                                  ? 'border-green-500 bg-green-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              )}
                            >
                              <User className={cn('h-4 w-4', selectedLocuitor === 'proprietar' ? 'text-green-600' : 'text-gray-400')} />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{selectedApartament.proprietar.nume}</p>
                                <p className="text-xs text-green-600">Proprietar</p>
                              </div>
                              {selectedLocuitor === 'proprietar' && (
                                <Check className="h-4 w-4 text-green-600 shrink-0" />
                              )}
                            </button>
                          )}
                          {selectedApartament.chirias && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLocuitor('chirias')
                                setFormData(prev => ({ ...prev, numeOrdonator: selectedApartament.chirias!.nume }))
                              }}
                              className={cn(
                                'w-full flex items-center gap-3 p-2 rounded-lg border transition-colors text-left',
                                selectedLocuitor === 'chirias'
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              )}
                            >
                              <User className={cn('h-4 w-4', selectedLocuitor === 'chirias' ? 'text-blue-600' : 'text-gray-400')} />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{selectedApartament.chirias.nume}</p>
                                <p className="text-xs text-blue-600">Chiriaș</p>
                              </div>
                              {selectedLocuitor === 'chirias' && (
                                <Check className="h-4 w-4 text-blue-600 shrink-0" />
                              )}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-orange-600">
                          <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm font-medium">Nu există locuitor configurat</p>
                          <p className="text-xs mt-1">Adăugați un proprietar sau chiriaș</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Outstanding balance */}
                  {totalRestant > 0 && !showAddLocuitor && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-orange-600 font-medium">
                        Sold restant: {totalRestant.toLocaleString('ro-RO')} lei
                      </p>
                      <p className="text-xs text-gray-500">
                        {chitanteForApartament.length} obligații neachitate
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Chitanta selection (optional, for partial payments) */}
              {selectedApartament && chitanteForApartament.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chitanță de achitat (opțional)
                  </label>
                  <select
                    value={formData.chitantaId}
                    onChange={(e) => handleChitantaSelect(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Toate restanțele ({totalRestant.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lei)</option>
                    {chitanteForApartament.map(ch => {
                      const rest = getRestant(ch)
                      return (
                        <option key={ch.id} value={ch.id}>
                          #{ch.numar} - {months[ch.luna - 1]} {ch.an} - rest: {rest.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lei (din {ch.sumaTotal.toLocaleString('ro-RO')} lei)
                        </option>
                      )
                    })}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sumă încasată (lei) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.suma}
                  onChange={(e) => setFormData({ ...formData, suma: e.target.value })}
                  placeholder="0.00"
                  className="text-lg font-semibold"
                />
                {totalRestant > 0 && parseFloat(formData.suma) < totalRestant && parseFloat(formData.suma) > 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    Plată parțială - va rămâne sold: {(totalRestant - parseFloat(formData.suma)).toLocaleString('ro-RO')} lei
                  </p>
                )}
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

              {/* Bank transfer details */}
              {formData.metodaPlata === 'TRANSFER' && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 space-y-3">
                  <p className="text-sm font-medium text-blue-700">Detalii extras bancar</p>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Nume ordonator (din extras)
                    </label>
                    <Input
                      value={formData.numeOrdonator}
                      onChange={(e) => setFormData({ ...formData, numeOrdonator: e.target.value })}
                      placeholder="ex: POPESCU ION"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Explicație din extras
                    </label>
                    <Input
                      value={formData.explicatieExtras}
                      onChange={(e) => setFormData({ ...formData, explicatieExtras: e.target.value })}
                      placeholder="ex: PLATA INTRETINERE IANUARIE"
                      className="text-sm"
                    />
                  </div>
                </div>
              )}

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
                  placeholder="ex: OP 12345 / Nr. chitanță manuală"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowAddModal(false)
                  setSelectedApartamentId('')
                  setSelectedLocuitor('')
                  setShowAddLocuitor(false)
                }}
              >
                Anulează
              </Button>
              <Button
                className={cn(
                  "flex-1",
                  formData.metodaPlata === 'CASH'
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-blue-600 hover:bg-blue-700"
                )}
                onClick={handleAdd}
                disabled={!selectedApartamentId || !formData.suma || !selectedLocuitor}
              >
                {formData.metodaPlata === 'CASH' ? (
                  <>
                    <Receipt className="h-4 w-4 mr-2" />
                    Emite chitanță
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Înregistrează plată
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
