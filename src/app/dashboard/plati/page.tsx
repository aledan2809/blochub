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
  FileText,
  Download,
  Send,
  Landmark,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAsociatie } from '@/contexts/AsociatieContext'
import Link from 'next/link'

interface PlataFurnizor {
  id: string
  suma: number
  dataPlata: string
  metodaPlata: string
  referinta: string | null
}

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
    contBancar?: string | null
  } | null
  // Câmpuri noi pentru plăți parțiale
  sumaPlatita: number
  restDePlata: number
  esteAchitatIntegral: boolean
  platiFurnizor: PlataFurnizor[]
}

interface ContBancar {
  id: string
  nume: string
  iban: string
  banca: string
  esteImplicit: boolean
}

interface PlataPending {
  id: string
  beneficiarNume: string
  beneficiarIban: string
  suma: number
  descriere: string
  status: 'PENDING' | 'EXPORTED' | 'PAID'
  createdAt: string
  exportedAt: string | null
  paidAt: string | null
  contBancar: {
    id: string
    nume: string
    iban: string
    banca: string
  }
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
  const [conturiBancare, setConturiBancare] = useState<ContBancar[]>([])
  const [platiPending, setPlatiPending] = useState<PlataPending[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showPaid, setShowPaid] = useState(false)
  const [activeTab, setActiveTab] = useState<'facturi' | 'pending'>('facturi')
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
    suma: '',
    metodaPlata: 'TRANSFER',
    contBancarId: '',
    beneficiarIban: '',
    referinta: '',
    dataPlata: new Date().toISOString().split('T')[0]
  })
  const [submitting, setSubmitting] = useState(false)

  // Export modal
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportContId, setExportContId] = useState('')
  const [exportFormat, setExportFormat] = useState('bt') // Default to BT format
  const [exporting, setExporting] = useState(false)

  // Bank format options for export
  const bankFormats = [
    { value: 'bt', label: 'Banca Transilvania (BT)', description: 'Format CSV specific BT' },
    { value: 'bcr', label: 'BCR', description: 'Format CSV specific BCR' },
    { value: 'ing', label: 'ING Bank', description: 'Format CSV specific ING' },
    { value: 'raiffeisen', label: 'Raiffeisen Bank', description: 'Format MultiCash' },
    { value: 'brd', label: 'BRD', description: 'Format CSV specific BRD' },
    { value: 'cec', label: 'CEC Bank', description: 'Format CSV specific CEC' },
    { value: 'unicredit', label: 'UniCredit', description: 'Format CSV specific UniCredit' },
    { value: 'alpha', label: 'Alpha Bank', description: 'Format CSV specific Alpha Bank' },
    { value: 'xml', label: 'SEPA XML', description: 'Format standard european pain.001' },
    { value: 'csv', label: 'CSV Generic', description: 'Format universal CSV' },
  ]

  useEffect(() => {
    if (currentAsociatie?.id) {
      fetchData()
      fetchConturiBancare()
      fetchPlatiPending()
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

  const fetchConturiBancare = async () => {
    if (!currentAsociatie?.id) return

    try {
      const res = await fetch(`/api/conturi-bancare?asociatieId=${currentAsociatie.id}`)
      if (res.ok) {
        const data = await res.json()
        setConturiBancare(data.conturi || [])
        // Set default bank account
        const defaultCont = (data.conturi || []).find((c: ContBancar) => c.esteImplicit)
        if (defaultCont) {
          setFormData(prev => ({ ...prev, contBancarId: defaultCont.id }))
          setExportContId(defaultCont.id)
        } else if (data.conturi?.length > 0) {
          setFormData(prev => ({ ...prev, contBancarId: data.conturi[0].id }))
          setExportContId(data.conturi[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch bank accounts:', error)
    }
  }

  const fetchPlatiPending = async () => {
    if (!currentAsociatie?.id) return

    try {
      // Fetch both PENDING and EXPORTED payments (not PAID)
      const [resPending, resExported] = await Promise.all([
        fetch(`/api/plati-bancare?asociatieId=${currentAsociatie.id}&status=PENDING`),
        fetch(`/api/plati-bancare?asociatieId=${currentAsociatie.id}&status=EXPORTED`)
      ])

      const dataPending = resPending.ok ? await resPending.json() : { plati: [] }
      const dataExported = resExported.ok ? await resExported.json() : { plati: [] }

      // Combine and sort by createdAt
      const allPlati = [...(dataPending.plati || []), ...(dataExported.plati || [])]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      setPlatiPending(allPlati)
    } catch (error) {
      console.error('Failed to fetch pending payments:', error)
    }
  }

  const handleMarkAsPaid = async (plataId: string) => {
    if (!confirm('Marcați această plată ca efectuată? Soldul va fi scăzut din cheltuială.')) return

    try {
      const res = await fetch('/api/plati-bancare', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: plataId,
          status: 'PAID'
        })
      })

      if (res.ok) {
        fetchPlatiPending()
        fetchData() // Refresh expenses to show updated balance
      } else {
        const error = await res.json()
        alert(error.error || 'Eroare la marcarea plății')
      }
    } catch (error) {
      console.error('Failed to mark payment as paid:', error)
    }
  }

  const handleOpenPayModal = (cheltuiala: Cheltuiala) => {
    setSelectedCheltuiala(cheltuiala)
    const defaultCont = conturiBancare.find(c => c.esteImplicit) || conturiBancare[0]
    // Folosește restDePlata în loc de suma totală
    const sumaDeAchitat = cheltuiala.restDePlata > 0 ? cheltuiala.restDePlata : cheltuiala.suma
    setFormData({
      suma: sumaDeAchitat.toString(),
      metodaPlata: 'TRANSFER',
      contBancarId: defaultCont?.id || '',
      beneficiarIban: cheltuiala.furnizor?.contBancar || '',
      referinta: cheltuiala.nrFactura || '',
      dataPlata: new Date().toISOString().split('T')[0]
    })
    setShowPayModal(true)
  }

  const handleSubmitPayment = async () => {
    if (!selectedCheltuiala || !currentAsociatie?.id) return
    setSubmitting(true)

    try {
      if (formData.metodaPlata === 'TRANSFER' && formData.contBancarId && formData.beneficiarIban) {
        // Add to pending bank transfers
        const res = await fetch('/api/plati-bancare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            asociatieId: currentAsociatie.id,
            contBancarId: formData.contBancarId,
            beneficiarNume: selectedCheltuiala.furnizor?.nume || 'Necunoscut',
            beneficiarIban: formData.beneficiarIban,
            suma: parseFloat(formData.suma),
            descriere: `${tipCheltuialaLabels[selectedCheltuiala.tip]} - ${selectedCheltuiala.nrFactura || 'fără nr.'} - ${months[selectedCheltuiala.luna - 1]} ${selectedCheltuiala.an}`,
            referinta: formData.referinta,
            cheltuialaId: selectedCheltuiala.id
          })
        })

        if (res.ok) {
          setShowPayModal(false)
          setSelectedCheltuiala(null)
          fetchPlatiPending()
          // Switch to pending tab to show the new payment
          setActiveTab('pending')
        } else {
          const error = await res.json()
          alert(error.error || 'Eroare la adăugare plată')
        }
      } else {
        // Mark as paid directly (non-transfer payment)
        const res = await fetch('/api/plati-furnizori', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cheltuialaId: selectedCheltuiala.id,
            suma: parseFloat(formData.suma),
            metodaPlata: formData.metodaPlata,
            referinta: formData.referinta || null,
            dataPlata: formData.dataPlata
          })
        })

        if (res.ok) {
          setShowPayModal(false)
          setSelectedCheltuiala(null)
          fetchData()
        } else {
          const error = await res.json()
          alert(error.error || 'Eroare la înregistrarea plății')
        }
      }
    } catch (error) {
      console.error('Failed to submit payment:', error)
    } finally {
      setSubmitting(false)
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

  const handleDeletePending = async (id: string) => {
    if (!confirm('Sigur doriți să ștergeți această plată din lista de așteptare?')) return

    try {
      const res = await fetch(`/api/plati-bancare?id=${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        fetchPlatiPending()
      }
    } catch (error) {
      console.error('Failed to delete pending payment:', error)
    }
  }

  const handleExport = async () => {
    if (!currentAsociatie?.id || !exportContId) return
    setExporting(true)

    try {
      const res = await fetch('/api/plati-bancare/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asociatieId: currentAsociatie.id,
          contBancarId: exportContId,
          format: exportFormat,
          markAsExported: true
        })
      })

      if (res.ok) {
        const blob = await res.blob()
        const filename = res.headers.get('X-Filename') || `plati.${exportFormat}`
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
        setShowExportModal(false)
        fetchPlatiPending()
      } else {
        const error = await res.json()
        alert(error.error || 'Eroare la export')
      }
    } catch (error) {
      console.error('Failed to export:', error)
    } finally {
      setExporting(false)
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
    if (cheltuiala.esteAchitatIntegral || !cheltuiala.dataScadenta) return false
    return new Date(cheltuiala.dataScadenta) < new Date()
  }

  // Group pending by bank
  const pendingByBank = useMemo(() => {
    const grouped: Record<string, { cont: ContBancar; plati: PlataPending[]; total: number }> = {}
    platiPending.forEach(p => {
      if (!grouped[p.contBancar.id]) {
        grouped[p.contBancar.id] = {
          cont: p.contBancar as ContBancar,
          plati: [],
          total: 0
        }
      }
      grouped[p.contBancar.id].plati.push(p)
      grouped[p.contBancar.id].total += p.suma
    })
    return grouped
  }, [platiPending])

  const pendingTotal = platiPending.reduce((sum, p) => sum + p.suma, 0)

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
        {platiPending.length > 0 && (
          <Button onClick={() => setShowExportModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Download className="h-4 w-4 mr-2" />
            Exportă fișier bancă ({platiPending.length})
          </Button>
        )}
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
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Send className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{platiPending.length}</p>
              <p className="text-sm text-gray-500">În așteptare export</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Landmark className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {pendingTotal.toLocaleString('ro-RO')} lei
              </p>
              <p className="text-sm text-gray-500">Total în așteptare</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('facturi')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeTab === 'facturi'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Facturi furnizori
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeTab === 'pending'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Plăți bancare
          {platiPending.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
              {platiPending.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'facturi' && (
        <>
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
                          {cheltuiala.sumaPlatita > 0 && !cheltuiala.esteAchitatIntegral && (
                            <div className="text-xs text-orange-600 font-medium">
                              Plătit: {cheltuiala.sumaPlatita.toLocaleString('ro-RO')} lei
                            </div>
                          )}
                          {cheltuiala.restDePlata > 0 && (
                            <div className="text-xs text-red-600 font-medium">
                              Rest: {cheltuiala.restDePlata.toLocaleString('ro-RO')} lei
                            </div>
                          )}
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
                          {cheltuiala.esteAchitatIntegral ? (
                            <div>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                Plătită integral
                              </span>
                              {cheltuiala.platiFurnizor && cheltuiala.platiFurnizor.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {cheltuiala.platiFurnizor.map((plata) => (
                                    <div key={plata.id} className="flex items-center gap-1 text-xs text-gray-500">
                                      {metodaPlataIcons[plata.metodaPlata]}
                                      <span>{plata.suma.toLocaleString('ro-RO')} lei</span>
                                      <span>- {new Date(plata.dataPlata).toLocaleDateString('ro-RO')}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : cheltuiala.sumaPlatita > 0 ? (
                            <div>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                Parțial plătită
                              </span>
                              {cheltuiala.platiFurnizor && cheltuiala.platiFurnizor.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {cheltuiala.platiFurnizor.map((plata) => (
                                    <div key={plata.id} className="flex items-center gap-1 text-xs text-gray-500">
                                      {metodaPlataIcons[plata.metodaPlata]}
                                      <span>{plata.suma.toLocaleString('ro-RO')} lei</span>
                                      <span>- {new Date(plata.dataPlata).toLocaleDateString('ro-RO')}</span>
                                    </div>
                                  ))}
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
                          <div className="flex flex-col gap-2 items-end">
                            {/* Buton plătește dacă mai e rest de plată */}
                            {cheltuiala.restDePlata > 0 && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleOpenPayModal(cheltuiala)}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                {cheltuiala.sumaPlatita > 0 ? 'Plătește restul' : 'Plătește'}
                              </Button>
                            )}
                            {/* Butoane pentru ștergere plăți individuale */}
                            {cheltuiala.platiFurnizor && cheltuiala.platiFurnizor.length > 0 && (
                              <div className="flex flex-wrap gap-1 justify-end">
                                {cheltuiala.platiFurnizor.map((plata) => (
                                  <Button
                                    key={plata.id}
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs px-2 py-1"
                                    onClick={() => handleRevertPayment(plata.id)}
                                    title={`Anulează plata de ${plata.suma.toLocaleString('ro-RO')} lei`}
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    {plata.suma.toLocaleString('ro-RO')}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'pending' && (
        <div className="space-y-4">
          {conturiBancare.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border">
              <Landmark className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nu aveți conturi bancare configurate
              </h3>
              <p className="text-gray-500 mb-4">
                Adăugați un cont bancar în{' '}
                <Link href="/dashboard/setari?tab=conturi" target="_blank" className="text-blue-600 hover:underline font-medium">
                  Setări
                </Link>
                {' '}pentru a genera fișiere de plată
              </p>
              <Link href="/dashboard/setari?tab=conturi" target="_blank">
                <Button>
                  Deschide Setări →
                </Button>
              </Link>
            </div>
          ) : platiPending.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border">
              <Send className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nu există plăți bancare de procesat
              </h3>
              <p className="text-gray-500">
                Adăugați plăți prin transfer bancar pentru a le exporta în fișier bancă
              </p>
            </div>
          ) : (
            <>
              {/* Summary of pending vs exported */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Plăți de procesat: {platiPending.filter(p => p.status === 'PENDING').length} în așteptare export, {platiPending.filter(p => p.status === 'EXPORTED').length} exportate
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Apăsați butonul verde &quot;Plătită&quot; după ce plata a fost efectuată în bancă pentru a scădea soldul din cheltuială.
                    </p>
                  </div>
                </div>
              </div>
              {Object.entries(pendingByBank).map(([bankId, { cont, plati, total }]) => (
              <div key={bankId} className="bg-white rounded-xl border overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Landmark className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">{cont.nume}</p>
                      <p className="text-xs text-gray-500">{cont.iban} - {cont.banca}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-blue-600">{total.toLocaleString('ro-RO')} lei</p>
                    <p className="text-xs text-gray-500">{plati.length} plăți</p>
                  </div>
                </div>
                <div className="divide-y">
                  {plati.map((plata) => (
                    <div key={plata.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{plata.beneficiarNume}</p>
                          {plata.status === 'EXPORTED' && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                              Exportat
                            </span>
                          )}
                          {plata.status === 'PENDING' && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
                              În așteptare
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{plata.beneficiarIban}</p>
                        <p className="text-xs text-gray-500">{plata.descriere}</p>
                        {plata.exportedAt && (
                          <p className="text-xs text-blue-600">
                            Exportat: {new Date(plata.exportedAt).toLocaleDateString('ro-RO')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{plata.suma.toLocaleString('ro-RO')} lei</p>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleMarkAsPaid(plata.id)}
                          title="Marchează ca plătită - soldul va fi scăzut din cheltuială"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Plătită
                        </Button>
                        {plata.status === 'PENDING' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeletePending(plata.id)}
                            title="Șterge din listă"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            </>
          )}
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && selectedCheltuiala && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPayModal(false)} />
          <div className="relative bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Înregistrează plată</h2>
              <button
                onClick={() => setShowPayModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Avertisment dacă lipsește furnizorul */}
            {!selectedCheltuiala.furnizor && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-700">Furnizor lipsă!</p>
                    <p className="text-xs text-red-600 mt-1">
                      Pentru a înregistra plăți, cheltuiala trebuie să aibă un furnizor asociat.
                    </p>
                    <Link
                      href="/dashboard/cheltuieli"
                      className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-red-700 hover:text-red-800 underline"
                      onClick={() => setShowPayModal(false)}
                    >
                      <Building2 className="h-4 w-4" />
                      Editează cheltuiala pentru a adăuga furnizor →
                    </Link>
                  </div>
                </div>
              </div>
            )}

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
                  <p className="text-lg font-semibold text-gray-900">
                    Total factură: {selectedCheltuiala.suma.toLocaleString('ro-RO')} lei
                  </p>
                  {selectedCheltuiala.sumaPlatita > 0 && (
                    <p className="text-sm text-green-600">
                      Plătit: {selectedCheltuiala.sumaPlatita.toLocaleString('ro-RO')} lei
                    </p>
                  )}
                  {selectedCheltuiala.restDePlata > 0 && (
                    <p className="text-sm font-semibold text-red-600">
                      Rest de plată: {selectedCheltuiala.restDePlata.toLocaleString('ro-RO')} lei
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {months[selectedCheltuiala.luna - 1]} {selectedCheltuiala.an}
                  </p>
                </div>
              </div>

              {/* Istoric plăți existente */}
              {selectedCheltuiala.platiFurnizor && selectedCheltuiala.platiFurnizor.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-2">Plăți înregistrate:</p>
                  <div className="space-y-1">
                    {selectedCheltuiala.platiFurnizor.map((plata) => (
                      <div key={plata.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-gray-600">
                          {metodaPlataIcons[plata.metodaPlata]}
                          <span>{metodaPlataLabels[plata.metodaPlata]}</span>
                          {plata.referinta && <span className="text-gray-400">({plata.referinta})</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600 font-medium">{plata.suma.toLocaleString('ro-RO')} lei</span>
                          <span className="text-gray-400">{new Date(plata.dataPlata).toLocaleDateString('ro-RO')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Editable amount */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sumă plată (lei) * {selectedCheltuiala.restDePlata > 0 && selectedCheltuiala.restDePlata < selectedCheltuiala.suma && (
                  <span className="text-gray-500 font-normal">(max: {selectedCheltuiala.restDePlata.toLocaleString('ro-RO')})</span>
                )}
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={selectedCheltuiala.restDePlata || selectedCheltuiala.suma}
                value={formData.suma}
                onChange={(e) => setFormData({ ...formData, suma: e.target.value })}
                className="text-lg font-semibold"
                placeholder="0.00"
              />
              {parseFloat(formData.suma) < selectedCheltuiala.restDePlata && parseFloat(formData.suma) > 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  Plată parțială - va rămâne de plată: {(selectedCheltuiala.restDePlata - parseFloat(formData.suma)).toLocaleString('ro-RO')} lei
                </p>
              )}
              {parseFloat(formData.suma) > selectedCheltuiala.restDePlata + 0.01 && (
                <p className="text-xs text-red-600 mt-1">
                  Suma depășește restul de plată!
                </p>
              )}
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

              {/* Bank account selection for transfers */}
              {formData.metodaPlata === 'TRANSFER' && (
                <>
                  {conturiBancare.length === 0 ? (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-sm text-orange-700">
                        Nu aveți conturi bancare configurate.{' '}
                        <Link href="/dashboard/setari?tab=conturi" target="_blank" className="font-medium underline hover:text-orange-800">
                          Adăugați un cont în Setări →
                        </Link>
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cont platitor *
                        </label>
                        <select
                          value={formData.contBancarId}
                          onChange={(e) => setFormData({ ...formData, contBancarId: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          {conturiBancare.map(cont => (
                            <option key={cont.id} value={cont.id}>
                              {cont.nume} - {cont.banca}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          IBAN beneficiar *
                        </label>
                        <Input
                          value={formData.beneficiarIban}
                          onChange={(e) => setFormData({ ...formData, beneficiarIban: e.target.value.toUpperCase() })}
                          placeholder="RO49AAAA1B31007593840000"
                        />
                        {!formData.beneficiarIban && (
                          <p className="text-xs text-orange-600 mt-1">
                            Adăugați IBAN-ul furnizorului în{' '}
                            <Link href="/dashboard/cheltuieli" target="_blank" className="font-medium underline hover:text-orange-700">
                              Cheltuieli →
                            </Link>
                          </p>
                        )}
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <Send className="h-4 w-4 text-blue-600 mt-0.5" />
                          <div className="text-sm text-blue-700">
                            <p className="font-medium">Plată va fi adăugată în lista de export</p>
                            <p className="text-xs mt-1">
                              Plata va fi salvată pentru a fi exportată ulterior în fișierul băncii
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {formData.metodaPlata !== 'TRANSFER' && (
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
              )}

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
                className={cn(
                  'flex-1',
                  formData.metodaPlata === 'TRANSFER'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-green-600 hover:bg-green-700'
                )}
                onClick={handleSubmitPayment}
                disabled={
                  submitting ||
                  !selectedCheltuiala.furnizor ||
                  (formData.metodaPlata === 'TRANSFER' && (!formData.contBancarId || !formData.beneficiarIban))
                }
              >
                {submitting ? (
                  'Se procesează...'
                ) : formData.metodaPlata === 'TRANSFER' ? (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Adaugă la export
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Confirmă plata
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowExportModal(false)} />
          <div className="relative bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Exportă fișier plăți</h2>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cont bancar
                </label>
                <select
                  value={exportContId}
                  onChange={(e) => setExportContId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {conturiBancare.map(cont => {
                    const pending = pendingByBank[cont.id]
                    return (
                      <option key={cont.id} value={cont.id}>
                        {cont.nume} ({pending?.plati.length || 0} plăți - {(pending?.total || 0).toLocaleString('ro-RO')} lei)
                      </option>
                    )
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Format bancă
                </label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {bankFormats.map(format => (
                    <option key={format.value} value={format.value}>
                      {format.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {bankFormats.find(f => f.value === exportFormat)?.description}
                </p>
              </div>

              {pendingByBank[exportContId] && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm font-medium">Sumar export:</p>
                  <p className="text-sm text-gray-600">
                    {pendingByBank[exportContId].plati.length} plăți = {pendingByBank[exportContId].total.toLocaleString('ro-RO')} lei
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowExportModal(false)}
              >
                Anulează
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={handleExport}
                disabled={exporting || !pendingByBank[exportContId]?.plati.length}
              >
                {exporting ? 'Se exportă...' : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Descarcă fișier
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
