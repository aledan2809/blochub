'use client'

import { useEffect, useState } from 'react'
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Save,
  Home,
  MapPin,
  Phone,
  Mail,
  Building,
  Calendar,
  Percent,
  CreditCard,
  Wallet,
  PiggyBank,
  Wrench,
  LayoutGrid,
  Download,
  FileSpreadsheet,
  FileText,
  ChevronDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { exportFinancialReportToPDF, exportFinancialReportToExcel } from '@/lib/export-utils'
import { useAsociatie } from '@/contexts/AsociatieContext'

interface Asociatie {
  id: string
  nume: string
  cui: string | null
  adresa: string
  oras: string
  judet: string
  codPostal: string | null
  email: string | null
  telefon: string | null
  contBancar: string | null
  banca: string | null
  ziScadenta: number
  penalizareZi: number
}

interface Scara {
  id: string
  numar: string
  etaje: number
  _count: {
    apartamente: number
  }
}

interface Cladire {
  id: string
  nume: string | null
  scari: Scara[]
}

interface Fond {
  id: string
  tip: 'RULMENT' | 'REPARATII' | 'ALTE'
  denumire: string
  sumaLunara: number
  soldCurent: number
}

interface TipApartament {
  id: string
  denumire: string
  nrCamere: number
  suprafata: number
  cotaIndiviza: number
  _count?: {
    apartamente: number
  }
}

const tipFondLabels: Record<string, string> = {
  RULMENT: 'Fond de rulment',
  REPARATII: 'Fond de reparații',
  ALTE: 'Alt fond',
}

const tipFondIcons: Record<string, React.ReactNode> = {
  RULMENT: <Wallet className="h-5 w-5" />,
  REPARATII: <Wrench className="h-5 w-5" />,
  ALTE: <PiggyBank className="h-5 w-5" />,
}

export default function CladirePage() {
  const toast = useToast()
  const { currentAsociatie } = useAsociatie()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [asociatie, setAsociatie] = useState<Asociatie | null>(null)
  const [cladiri, setCladiri] = useState<Cladire[]>([])
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState<Partial<Asociatie>>({})
  const [showAddCladire, setShowAddCladire] = useState(false)
  const [newCladire, setNewCladire] = useState({ nume: '' })
  const [showAddScara, setShowAddScara] = useState<string | null>(null) // cladireId
  const [newScara, setNewScara] = useState({ numar: '', etaje: 10 })
  const [fonduri, setFonduri] = useState<Fond[]>([])
  const [showAddFond, setShowAddFond] = useState(false)
  const [newFond, setNewFond] = useState({ tip: 'RULMENT' as const, denumire: '', sumaLunara: 0 })
  const [tipuriApartament, setTipuriApartament] = useState<TipApartament[]>([])
  const [showAddTip, setShowAddTip] = useState(false)
  const [newTip, setNewTip] = useState({ denumire: '', nrCamere: 2, suprafata: 50, cotaIndiviza: 2 })
  const [showExportMenu, setShowExportMenu] = useState(false)

  useEffect(() => {
    if (currentAsociatie) {
      fetchData()
    }
  }, [currentAsociatie])

  async function fetchData() {
    if (!currentAsociatie) return

    setLoading(true)
    console.log('fetchData - currentAsociatie:', { id: currentAsociatie.id, nume: currentAsociatie.nume })

    try {
      // Pass the current asociatie ID to the API
      const cladireRes = await fetch(`/api/cladire?asociatieId=${currentAsociatie.id}`, { cache: 'no-store' })
      const cladireData = await cladireRes.json()
      console.log('fetchData - API response:', { asociatieId: cladireData.asociatie?.id, asociatieNume: cladireData.asociatie?.nume, cladiriCount: cladireData.cladiri?.length })

      if (cladireData.asociatie) {
        setAsociatie(cladireData.asociatie)
        setFormData(cladireData.asociatie)
        setCladiri(cladireData.cladiri || [])

        // Fetch fonduri and tipuri apartament with asociatieId
        const [fonduriRes, tipuriRes] = await Promise.all([
          fetch(`/api/fonduri?asociatieId=${cladireData.asociatie.id}`, { cache: 'no-store' }),
          fetch(`/api/tipuri-apartament?asociatieId=${cladireData.asociatie.id}`, { cache: 'no-store' })
        ])

        const fonduriData = await fonduriRes.json()
        const tipuriData = await tipuriRes.json()

        if (fonduriData.fonduri) {
          setFonduri(fonduriData.fonduri)
        }
        if (tipuriData.tipuri) {
          setTipuriApartament(tipuriData.tipuri)
        }
      } else {
        // New asociatie - no data yet
        setAsociatie(null)
        setCladiri([])
        setFonduri([])
        setTipuriApartament([])
      }
    } catch (err) {
      console.error('Error:', err)
      toast.error('Eroare la încărcarea datelor')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!asociatie) return
    setSaving(true)

    try {
      const res = await fetch('/api/cladire', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        const data = await res.json()
        setAsociatie(data.asociatie)
        setEditMode(false)
        toast.success('Asociație actualizată cu succes')
      } else {
        toast.error('Eroare la salvarea datelor')
      }
    } catch (err) {
      console.error('Error saving:', err)
      toast.error('Eroare la salvarea datelor')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddCladire() {
    const asociatieId = asociatie?.id || currentAsociatie?.id
    if (!asociatieId) return

    try {
      const res = await fetch('/api/cladire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nume: newCladire.nume || 'Clădire nouă',
          asociatieId
        })
      })

      if (res.ok) {
        const data = await res.json()
        setCladiri([...cladiri, { ...data.cladire, scari: [] }])
        setNewCladire({ nume: '' })
        setShowAddCladire(false)
        toast.success('Clădire adăugată cu succes')
      } else {
        toast.error('Eroare la adăugarea clădirii')
      }
    } catch (err) {
      console.error('Error adding cladire:', err)
      toast.error('Eroare la adăugarea clădirii')
    }
  }

  async function handleAddScara() {
    const asociatieId = asociatie?.id || currentAsociatie?.id
    if (!asociatieId || !newScara.numar || !showAddScara) {
      console.log('Validation failed:', { asociatieId, numar: newScara.numar, showAddScara })
      return
    }

    const requestBody = {
      numar: newScara.numar,
      etaje: newScara.etaje,
      cladireId: showAddScara,
      asociatieId
    }
    console.log('Adding scara with body:', requestBody)

    try {
      const res = await fetch('/api/scari', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const data = await res.json()
      console.log('API response:', { ok: res.ok, status: res.status, data })

      if (res.ok && data.scara) {
        // Update the cladiri state with the new scara
        setCladiri(cladiri.map(c =>
          c.id === showAddScara
            ? { ...c, scari: [...c.scari, { ...data.scara, _count: { apartamente: 0 } }] }
            : c
        ))
        setNewScara({ numar: '', etaje: 10 })
        setShowAddScara(null)
        toast.success('Scară adăugată cu succes')
      } else {
        console.error('API error:', data)
        toast.error(data.error || 'Eroare la adăugarea scării')
      }
    } catch (err) {
      console.error('Error adding scara:', err)
      toast.error('Eroare la adăugarea scării')
    }
  }

  async function handleDeleteScara(scaraId: string, cladireId: string) {
    if (!confirm('Sigur vrei să ștergi această scară? Apartamentele asociate vor fi dezasociate.')) return

    try {
      const res = await fetch(`/api/scari?id=${scaraId}`, { method: 'DELETE' })
      if (res.ok) {
        // Update cladiri state by removing the scara
        setCladiri(cladiri.map(c =>
          c.id === cladireId
            ? { ...c, scari: c.scari.filter(s => s.id !== scaraId) }
            : c
        ))
        toast.success('Scară ștearsă cu succes')
      } else {
        toast.error('Eroare la ștergerea scării')
      }
    } catch (err) {
      console.error('Error deleting scara:', err)
      toast.error('Eroare la ștergerea scării')
    }
  }

  async function handleDeleteCladire(cladireId: string) {
    const cladire = cladiri.find(c => c.id === cladireId)
    if (!cladire) return

    if (cladire.scari.length > 0) {
      toast.warning('Nu poți șterge o clădire care are scări. Șterge mai întâi scările.')
      return
    }

    if (!confirm('Sigur vrei să ștergi această clădire?')) return

    try {
      const res = await fetch(`/api/cladire?id=${cladireId}`, { method: 'DELETE' })
      if (res.ok) {
        setCladiri(cladiri.filter(c => c.id !== cladireId))
        toast.success('Clădire ștearsă cu succes')
      } else {
        toast.error('Eroare la ștergerea clădirii')
      }
    } catch (err) {
      console.error('Error deleting cladire:', err)
      toast.error('Eroare la ștergerea clădirii')
    }
  }

  async function handleAddFond() {
    const asociatieId = asociatie?.id || currentAsociatie?.id
    if (!asociatieId || !newFond.denumire || newFond.sumaLunara <= 0) return

    try {
      const res = await fetch('/api/fonduri', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newFond, asociatieId })
      })

      if (res.ok) {
        const data = await res.json()
        setFonduri([...fonduri, data.fond])
        setNewFond({ tip: 'RULMENT', denumire: '', sumaLunara: 0 })
        setShowAddFond(false)
        toast.success('Fond adăugat cu succes')
      } else {
        toast.error('Eroare la adăugarea fondului')
      }
    } catch (err) {
      console.error('Error adding fond:', err)
      toast.error('Eroare la adăugarea fondului')
    }
  }

  async function handleDeleteFond(fondId: string) {
    if (!confirm('Sigur vrei să ștergi acest fond?')) return

    try {
      const res = await fetch(`/api/fonduri?id=${fondId}`, { method: 'DELETE' })
      if (res.ok) {
        setFonduri(fonduri.filter(f => f.id !== fondId))
        toast.success('Fond șters cu succes')
      } else {
        toast.error('Eroare la ștergerea fondului')
      }
    } catch (err) {
      console.error('Error deleting fond:', err)
      toast.error('Eroare la ștergerea fondului')
    }
  }

  async function handleAddTipApartament() {
    const asociatieId = asociatie?.id || currentAsociatie?.id
    if (!asociatieId || !newTip.denumire) return

    try {
      const res = await fetch('/api/tipuri-apartament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTip,
          asociatieId
        })
      })

      if (res.ok) {
        const data = await res.json()
        setTipuriApartament([...tipuriApartament, data.tip])
        setNewTip({ denumire: '', nrCamere: 2, suprafata: 50, cotaIndiviza: 2 })
        setShowAddTip(false)
        toast.success('Tip apartament adăugat cu succes')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Eroare la adăugarea tipului de apartament')
      }
    } catch (err) {
      console.error('Error adding tip apartament:', err)
      toast.error('Eroare la adăugarea tipului de apartament')
    }
  }

  async function handleDeleteTipApartament(tipId: string) {
    if (!confirm('Sigur vrei să ștergi acest tip de apartament?')) return

    try {
      const res = await fetch(`/api/tipuri-apartament?id=${tipId}`, { method: 'DELETE' })
      if (res.ok) {
        setTipuriApartament(tipuriApartament.filter(t => t.id !== tipId))
        toast.success('Tip apartament șters cu succes')
      } else {
        toast.error('Eroare la ștergerea tipului de apartament')
      }
    } catch (err) {
      console.error('Error deleting tip apartament:', err)
      toast.error('Eroare la ștergerea tipului de apartament')
    }
  }

  if (loading || !currentAsociatie) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // Use asociatie from API for detailed data, but fall back to currentAsociatie
  const displayAsociatie = asociatie || {
    id: currentAsociatie.id,
    nume: currentAsociatie.nume,
    adresa: currentAsociatie.adresa,
    oras: currentAsociatie.oras,
    cui: null,
    judet: '',
    codPostal: null,
    email: null,
    telefon: null,
    contBancar: null,
    banca: null,
    ziScadenta: 25,
    penalizareZi: 0.0002,
  } as Asociatie

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clădire</h1>
          <p className="text-gray-500">Configurare asociație și scări</p>
        </div>
        {!editMode ? (
          <Button onClick={() => setEditMode(true)} variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Editează
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setEditMode(false); setFormData(displayAsociatie) }}>
              Anulează
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvează
            </Button>
          </div>
        )}
      </div>

      {/* Association Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Detalii Asociație
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Denumire asociație *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.nume || ''}
                  onChange={(e) => setFormData({ ...formData, nume: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CUI</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.cui || ''}
                  onChange={(e) => setFormData({ ...formData, cui: e.target.value })}
                  placeholder="RO12345678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cod Poștal</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.codPostal || ''}
                  onChange={(e) => setFormData({ ...formData, codPostal: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresă *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.adresa || ''}
                  onChange={(e) => setFormData({ ...formData, adresa: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Oraș *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.oras || ''}
                  onChange={(e) => setFormData({ ...formData, oras: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Județ *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.judet || ''}
                  onChange={(e) => setFormData({ ...formData, judet: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.telefon || ''}
                  onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cont bancar (IBAN)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.contBancar || ''}
                  onChange={(e) => setFormData({ ...formData, contBancar: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bancă</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.banca || ''}
                  onChange={(e) => setFormData({ ...formData, banca: e.target.value })}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500">Denumire</div>
                  <div className="font-medium">{displayAsociatie.nume}</div>
                </div>
                {displayAsociatie.cui && (
                  <div>
                    <div className="text-sm text-gray-500">CUI</div>
                    <div className="font-medium">{displayAsociatie.cui}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Adresă
                  </div>
                  <div className="font-medium">
                    {displayAsociatie.adresa}, {displayAsociatie.oras}, {displayAsociatie.judet}
                    {displayAsociatie.codPostal && `, ${displayAsociatie.codPostal}`}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                {displayAsociatie.email && (
                  <div>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Email
                    </div>
                    <div className="font-medium">{displayAsociatie.email}</div>
                  </div>
                )}
                {displayAsociatie.telefon && (
                  <div>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Telefon
                    </div>
                    <div className="font-medium">{displayAsociatie.telefon}</div>
                  </div>
                )}
                {displayAsociatie.contBancar && (
                  <div>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <CreditCard className="h-3 w-3" /> Cont bancar
                    </div>
                    <div className="font-medium font-mono text-sm">
                      {displayAsociatie.contBancar}
                      {displayAsociatie.banca && <span className="text-gray-500"> ({displayAsociatie.banca})</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Setări Facturare
          </CardTitle>
          <CardDescription>Configurează scadența și penalizările</CardDescription>
        </CardHeader>
        <CardContent>
          {editMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zi scadență chitanțe
                </label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.ziScadenta || 25}
                  onChange={(e) => setFormData({ ...formData, ziScadenta: parseInt(e.target.value) })}
                />
                <p className="text-xs text-gray-500 mt-1">Luna în care chitanța trebuie plătită</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Penalizare zilnică (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={(formData.penalizareZi || 0.02) * 100}
                  onChange={(e) => setFormData({ ...formData, penalizareZi: parseFloat(e.target.value) / 100 })}
                />
                <p className="text-xs text-gray-500 mt-1">Procent aplicat zilnic la restanțe</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Calendar className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-sm text-gray-500">Zi scadență</div>
                  <div className="font-semibold text-lg">{displayAsociatie.ziScadenta}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Percent className="h-8 w-8 text-orange-600" />
                <div>
                  <div className="text-sm text-gray-500">Penalizare/zi</div>
                  <div className="font-semibold text-lg">{(displayAsociatie.penalizareZi * 100).toFixed(2)}%</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clădiri */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Clădiri
              </CardTitle>
              <CardDescription>
                {cladiri.length === 0
                  ? 'Adaugă clădirile asociației'
                  : `${cladiri.length} clădiri • ${cladiri.reduce((sum, c) => sum + c.scari.length, 0)} scări total`}
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddCladire(true)} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adaugă clădire
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {cladiri.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-2" />
              <p>Nu ai configurat clădiri.</p>
              <p className="text-sm">Adaugă prima clădire pentru a gestiona asociația.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cladiri.map((cladire) => (
                <div
                  key={cladire.id}
                  className="border rounded-lg overflow-hidden"
                >
                  {/* Cladire Header */}
                  <div className="bg-blue-50 border-b px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {cladire.nume || 'Clădire fără nume'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {cladire.scari.length} scări • {cladire.scari.reduce((sum, s) => sum + s._count.apartamente, 0)} apartamente
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setShowAddScara(cladire.id)}
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adaugă scară
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCladire(cladire.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Scari List */}
                  <div className="p-4">
                    {cladire.scari.length === 0 ? (
                      <div className="text-center py-6 text-gray-500">
                        <Building className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                        <p className="text-sm">Nicio scară configurată</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {cladire.scari.map((scara) => (
                          <div
                            key={scara.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                          >
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 bg-blue-100 rounded flex items-center justify-center">
                                <span className="font-bold text-blue-600 text-sm">{scara.numar}</span>
                              </div>
                              <div>
                                <div className="font-medium text-sm">Scara {scara.numar}</div>
                                <div className="text-xs text-gray-500">
                                  {scara.etaje} etaje • {scara._count.apartamente} apt.
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteScara(scara.id, cladire.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tipuri Apartamente */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-purple-600" />
                Tipuri Apartamente
              </CardTitle>
              <CardDescription>
                {tipuriApartament.length === 0
                  ? 'Definește tipurile de apartamente din bloc (garsonieră, 2 camere, etc.)'
                  : `${tipuriApartament.length} tipuri configurate`}
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddTip(true)} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adaugă tip
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tipuriApartament.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <LayoutGrid className="h-12 w-12 mx-auto text-gray-300 mb-2" />
              <p>Nu ai configurat tipuri de apartamente.</p>
              <p className="text-sm">Definește tipurile pentru a le folosi la adăugarea apartamentelor.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tipuriApartament.map((tip) => (
                <div
                  key={tip.id}
                  className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Home className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium">{tip.denumire}</div>
                      <div className="text-sm text-gray-500">
                        {tip.nrCamere} cam • {tip.suprafata} mp • {tip.cotaIndiviza}%
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTipApartament(tip.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fonduri Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-green-600" />
                Fonduri
              </CardTitle>
              <CardDescription>
                {fonduri.length === 0
                  ? 'Configurează fondurile lunare (rulment, reparații)'
                  : `${fonduri.length} fonduri • Total: ${fonduri.reduce((s, f) => s + f.sumaLunara, 0)} lei/apt/lună`}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
                {showExportMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowExportMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                      <button
                        onClick={() => {
                          exportFinancialReportToExcel({
                            asociatie,
                            apartamente: [],
                            fonduri
                          })
                          toast.success('Raport Excel generat cu succes')
                          setShowExportMenu(false)
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 rounded-t-lg"
                      >
                        <FileSpreadsheet className="h-4 w-4 text-green-600" />
                        Export Excel
                      </button>
                      <button
                        onClick={() => {
                          exportFinancialReportToPDF({
                            asociatie,
                            apartamente: [],
                            fonduri
                          })
                          toast.success('Raport PDF generat cu succes')
                          setShowExportMenu(false)
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 rounded-b-lg"
                      >
                        <FileText className="h-4 w-4 text-red-600" />
                        Export PDF
                      </button>
                    </div>
                  </>
                )}
              </div>
              <Button onClick={() => setShowAddFond(true)} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adaugă fond
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {fonduri.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <PiggyBank className="h-12 w-12 mx-auto text-gray-300 mb-2" />
              <p>Nu ai configurat fonduri.</p>
              <p className="text-sm">Fondurile se adaugă automat la chitanțe.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fonduri.map((fond) => (
                <div
                  key={fond.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      fond.tip === 'RULMENT' ? 'bg-blue-100 text-blue-600' :
                      fond.tip === 'REPARATII' ? 'bg-orange-100 text-orange-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {tipFondIcons[fond.tip]}
                    </div>
                    <div>
                      <div className="font-medium">{fond.denumire}</div>
                      <div className="text-sm text-gray-500">
                        {tipFondLabels[fond.tip]} • Sold: {fond.soldCurent.toLocaleString('ro-RO')} lei
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold text-green-600">{fond.sumaLunara} lei</div>
                      <div className="text-xs text-gray-500">per apt/lună</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteFond(fond.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Total summary */}
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200 mt-4">
                <span className="font-medium text-green-800">Total fonduri lunare</span>
                <span className="font-bold text-green-700">
                  {fonduri.reduce((s, f) => s + f.sumaLunara, 0)} lei/apartament
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Fond Modal */}
      {showAddFond && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Adaugă Fond</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tip fond *
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={newFond.tip}
                  onChange={(e) => setNewFond({ ...newFond, tip: e.target.value as any })}
                >
                  <option value="RULMENT">Fond de rulment</option>
                  <option value="REPARATII">Fond de reparații</option>
                  <option value="ALTE">Alt fond</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Denumire *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={newFond.denumire}
                  onChange={(e) => setNewFond({ ...newFond, denumire: e.target.value })}
                  placeholder="ex: Fond rulment scări, Fond lift"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sumă lunară per apartament (lei) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={newFond.sumaLunara || ''}
                  onChange={(e) => setNewFond({ ...newFond, sumaLunara: parseFloat(e.target.value) || 0 })}
                  placeholder="ex: 20"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddFond(false)}
                >
                  Anulează
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAddFond}
                  disabled={!newFond.denumire || newFond.sumaLunara <= 0}
                >
                  Adaugă
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Tip Apartament Modal */}
      {showAddTip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Adaugă Tip Apartament</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Denumire *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={newTip.denumire}
                  onChange={(e) => setNewTip({ ...newTip, denumire: e.target.value })}
                  placeholder="ex: Garsonieră, 2 camere decomandat"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nr. camere *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={newTip.nrCamere}
                    onChange={(e) => setNewTip({ ...newTip, nrCamere: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Suprafață (mp) *
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={newTip.suprafata}
                    onChange={(e) => setNewTip({ ...newTip, suprafata: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cotă (%) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={newTip.cotaIndiviza}
                    onChange={(e) => setNewTip({ ...newTip, cotaIndiviza: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Cota indiviză reprezintă procentul din cheltuielile comune suportate de acest tip de apartament.
              </p>
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddTip(false)}
                >
                  Anulează
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAddTipApartament}
                  disabled={!newTip.denumire || newTip.nrCamere < 1 || newTip.suprafata < 1}
                >
                  Adaugă
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Cladire Modal */}
      {showAddCladire && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Adaugă Clădire</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nume clădire (opțional)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={newCladire.nume}
                  onChange={(e) => setNewCladire({ ...newCladire, nume: e.target.value })}
                  placeholder="ex: Clădirea A, Bloc Principal"
                />
                <p className="text-xs text-gray-500 mt-1">Lasă gol pentru nume implicit</p>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddCladire(false)}
                >
                  Anulează
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAddCladire}
                >
                  Adaugă Clădire
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Scara Modal */}
      {showAddScara && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Adaugă Scară</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Număr/Nume scară *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={newScara.numar}
                  onChange={(e) => setNewScara({ ...newScara, numar: e.target.value })}
                  placeholder="ex: A, B, 1, 2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Număr etaje
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={newScara.etaje}
                  onChange={(e) => setNewScara({ ...newScara, etaje: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddScara(null)}
                >
                  Anulează
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAddScara}
                  disabled={!newScara.numar}
                >
                  Adaugă Scară
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
