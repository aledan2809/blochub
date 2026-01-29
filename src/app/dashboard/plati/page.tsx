'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  CreditCard,
  Plus,
  Search,
  Banknote,
  ArrowUpRight,
  X,
  Check,
  AlertCircle,
  Clock,
  CheckCircle2,
  Building2,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAsociatie } from '@/contexts/AsociatieContext'

interface Cheltuiala {
  id: string
  tip: string
  descriere: string | null
  suma: number
  dataFactura: string
  dataScadenta: string | null
  nrFactura: string | null
  luna: number
  an: number
  platita: boolean
  dataPlata: string | null
  metodaPlataFurnizor: string | null
  referintaPlata: string | null
  furnizor: {
    id: string
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
  ALTE_CHELTUIELI: 'Alte cheltuieli'
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
  ALTELE: <CreditCard className="h-4 w-4" />
}

const months = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
]

export default function PlatiPage() {
  const { currentAsociatie } = useAsociatie()
  const [cheltuieli, setCheltuieli] = useState<Cheltuiala[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showPaid, setShowPaid] = useState(false)
  const [stats, setStats] = useState({
    unpaidCount: 0,
    unpaidTotal: 0,
    paidCount: 0,
    paidTotal: 0
  })

  // Modal
  const [showPayModal, setShowPayModal] = useState(false)
  const [selectedCheltuiala, setSelectedCheltuiala] = useState<Cheltuiala | null>(null)
  const [formData, setFormData] = useState({
    metodaPlata: 'TRANSFER',
    referinta: '',
    dataPlata: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    if (currentAsociatie?.id) {
      fetchData()
    }
  }, [currentAsociatie?.id, showPaid])

  const fetchData = async () => {
    if (!currentAsociatie?.id) return

    try {
      const res = await fetch(
        `/api/plati-furnizori?asociatieId=${currentAsociatie.id}&showPaid=${showPaid}`
      )

      if (res.ok) {
        const data = await res.json()
        setCheltuieli(data.cheltuieli || [])
        setStats(data.stats || {
          unpaidCount: 0,
          unpaidTotal: 0,
          paidCount: 0,
          paidTotal: 0
        })
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenPayModal = (cheltuiala: Cheltuiala) => {
    setSelectedCheltuiala(cheltuiala)
    setFormData({
      metodaPlata: 'TRANSFER',
      referinta: '',
      dataPlata: new Date().toISOString().split('T')[0]
    })
    setShowPayModal(true)
  }

  const handleMarkAsPaid = async () => {
    if (!selectedCheltuiala) return

    try {
      const res = await fetch('/api/plati-furnizori', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cheltuialaId: selectedCheltuiala.id,
          metodaPlata: formData.metodaPlata,
          referinta: formData.referinta,
          dataPlata: formData.dataPlata
        })
      })

      if (res.ok) {
        setShowPayModal(false)
        setSelectedCheltuiala(null)
        fetchData()
      }
    } catch (error) {
      console.error('Failed to mark as paid:', error)
    }
  }

  const handleRevertPayment = async (id: string) => {
    if (!confirm('Sigur doriți să anulați această plată?')) return

    try {
      const res = await fetch(`/api/plati-furnizori?id=${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Failed to revert payment:', error)
    }
  }

  // Filter cheltuieli
  const filtered = useMemo(() => {
    return cheltuieli.filter(c => {
      const term = searchTerm.toLowerCase()
      return (
        tipCheltuialaLabels[c.tip]?.toLowerCase().includes(term) ||
        c.furnizor?.nume.toLowerCase().includes(term) ||
        c.nrFactura?.toLowerCase().includes(term) ||
        c.descriere?.toLowerCase().includes(term)
      )
    })
  }, [cheltuieli, searchTerm])

  // Check if expense is overdue
  const isOverdue = (cheltuiala: Cheltuiala) => {
    if (cheltuiala.platita || !cheltuiala.dataScadenta) return false
    return new Date(cheltuiala.dataScadenta) < new Date()
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
            <CreditCard className="h-7 w-7 text-red-600" />
            Plăți Furnizori
          </h1>
          <p className="text-gray-600 mt-1">
            Gestionați plățile către furnizori
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.unpaidCount}</p>
              <p className="text-sm text-gray-500">Facturi neplătite</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.unpaidTotal.toLocaleString('ro-RO')} lei
              </p>
              <p className="text-sm text-gray-500">Total de plătit</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.paidCount}</p>
              <p className="text-sm text-gray-500">Facturi plătite</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.paidTotal.toLocaleString('ro-RO')} lei
              </p>
              <p className="text-sm text-gray-500">Total plătit</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Caută după tip, furnizor sau număr factură..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={!showPaid ? 'default' : 'outline'}
            onClick={() => setShowPaid(false)}
            size="sm"
          >
            <Clock className="h-4 w-4 mr-2" />
            Neplătite
          </Button>
          <Button
            variant={showPaid ? 'default' : 'outline'}
            onClick={() => setShowPaid(true)}
            size="sm"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Toate
          </Button>
        </div>
      </div>

      {/* Expenses List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'Nu s-au găsit rezultate' : 'Nu există facturi neplătite'}
          </h3>
          <p className="text-gray-500">
            {searchTerm
              ? 'Încercați alte criterii de căutare'
              : 'Toate facturile au fost achitate'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Tip cheltuială</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Furnizor</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Nr. Factură</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Sumă</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Scadență</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((cheltuiala) => (
                  <tr key={cheltuiala.id} className={cn(
                    'hover:bg-gray-50',
                    isOverdue(cheltuiala) && 'bg-red-50'
                  )}>
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {tipCheltuialaLabels[cheltuiala.tip] || cheltuiala.tip}
                      </div>
                      {cheltuiala.descriere && (
                        <div className="text-xs text-gray-500">
                          {cheltuiala.descriere}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {cheltuiala.furnizor ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span>{cheltuiala.furnizor.nume}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {cheltuiala.nrFactura ? (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span>{cheltuiala.nrFactura}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">
                        {cheltuiala.suma.toLocaleString('ro-RO')} lei
                      </div>
                      <div className="text-xs text-gray-500">
                        {months[cheltuiala.luna - 1]} {cheltuiala.an}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {cheltuiala.dataScadenta ? (
                        <div className={cn(
                          'text-sm',
                          isOverdue(cheltuiala) ? 'text-red-600 font-medium' : 'text-gray-600'
                        )}>
                          {new Date(cheltuiala.dataScadenta).toLocaleDateString('ro-RO')}
                          {isOverdue(cheltuiala) && (
                            <span className="block text-xs">Scadentă</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {cheltuiala.platita ? (
                        <div>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Plătită
                          </span>
                          {cheltuiala.dataPlata && (
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(cheltuiala.dataPlata).toLocaleDateString('ro-RO')}
                            </div>
                          )}
                          {cheltuiala.metodaPlataFurnizor && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                              {metodaPlataIcons[cheltuiala.metodaPlataFurnizor]}
                              {metodaPlataLabels[cheltuiala.metodaPlataFurnizor]}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          isOverdue(cheltuiala)
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        )}>
                          {isOverdue(cheltuiala) ? 'Scadentă' : 'Neplătită'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {cheltuiala.platita ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRevertPayment(cheltuiala.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Anulează
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleOpenPayModal(cheltuiala)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Plătește
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && selectedCheltuiala && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPayModal(false)} />
          <div className="relative bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Înregistrează plată</h2>
              <button
                onClick={() => setShowPayModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Selected expense info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">
                    {tipCheltuialaLabels[selectedCheltuiala.tip] || selectedCheltuiala.tip}
                  </p>
                  {selectedCheltuiala.furnizor && (
                    <p className="text-sm text-gray-500">{selectedCheltuiala.furnizor.nume}</p>
                  )}
                  {selectedCheltuiala.nrFactura && (
                    <p className="text-sm text-gray-500">Factură: {selectedCheltuiala.nrFactura}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">
                    {selectedCheltuiala.suma.toLocaleString('ro-RO')} lei
                  </p>
                  <p className="text-sm text-gray-500">
                    {months[selectedCheltuiala.luna - 1]} {selectedCheltuiala.an}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
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
                  placeholder="ex: OP 12345 / Nr. chitanță"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPayModal(false)}
              >
                Anulează
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleMarkAsPaid}
              >
                <Check className="h-4 w-4 mr-2" />
                Confirmă plata
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
