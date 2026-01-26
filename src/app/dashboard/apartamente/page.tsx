'use client'

import { useEffect, useState } from 'react'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Loader2,
  Home,
  Upload,
  ChevronDown,
  Check,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Apartament {
  id: string
  numar: string
  etaj: number | null
  suprafata: number | null
  nrCamere: number | null
  nrPersoane: number
  cotaIndiviza: number | null
  scaraId: string | null
  scara?: { numar: string } | null
  tipApartamentId?: string | null
  asociatieId?: string
  proprietari: Array<{
    user: {
      id: string
      name: string | null
      email: string
    }
  }>
}

interface Scara {
  id: string
  numar: string
}

interface TipApartament {
  id: string
  denumire: string
  nrCamere: number
  suprafata: number
  cotaIndiviza: number
}

export default function ApartamentePage() {
  const [apartamente, setApartamente] = useState<Apartament[]>([])
  const [scari, setScari] = useState<Scara[]>([])
  const [tipuriApartament, setTipuriApartament] = useState<TipApartament[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [asociatieId, setAsociatieId] = useState<string | null>(null)
  const [filterScara, setFilterScara] = useState<string>('ALL')
  const [editingApt, setEditingApt] = useState<Apartament | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      // Get association info and scari
      const cladireRes = await fetch('/api/cladire')
      const cladireData = await cladireRes.json()

      if (!cladireData.asociatie) {
        setLoading(false)
        return
      }

      setAsociatieId(cladireData.asociatie.id)
      setScari(cladireData.scari || [])

      // Fetch tipuri apartament
      const tipuriRes = await fetch(`/api/tipuri-apartament?asociatieId=${cladireData.asociatie.id}`)
      const tipuriData = await tipuriRes.json()
      setTipuriApartament(tipuriData.tipuri || [])

      // Get apartments
      const res = await fetch(`/api/apartamente?asociatieId=${cladireData.asociatie.id}`)
      const data = await res.json()
      // Add asociatieId to each apartment for edit modal
      setApartamente((data.apartamente || []).map((apt: Apartament) => ({
        ...apt,
        asociatieId: cladireData.asociatie.id,
      })))
    } catch (err) {
      console.error('Error fetching apartments:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredApartamente = apartamente.filter(apt => {
    const matchesSearch = apt.numar.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.proprietari.some(p =>
        p.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    const matchesScara = filterScara === 'ALL' ||
      (filterScara === 'NONE' && !apt.scaraId) ||
      apt.scaraId === filterScara
    return matchesSearch && matchesScara
  })

  // Group by scara
  const groupedApartamente = filteredApartamente.reduce((acc, apt) => {
    const key = apt.scara?.numar || 'Fără scară'
    if (!acc[key]) acc[key] = []
    acc[key].push(apt)
    return acc
  }, {} as Record<string, Apartament[]>)

  async function handleDelete(aptId: string) {
    if (!confirm('Sigur vrei să ștergi acest apartament?')) return

    try {
      await fetch(`/api/apartamente?id=${aptId}`, { method: 'DELETE' })
      setApartamente(apartamente.filter(a => a.id !== aptId))
    } catch (err) {
      console.error('Error deleting apartment:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!asociatieId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Home className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Configurează mai întâi clădirea
          </h3>
          <p className="text-gray-500 mb-4">
            Mergi la Dashboard pentru a crea asociația.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Apartamente</h1>
          <p className="text-gray-500">{apartamente.length} apartamente înregistrate</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowBulkModal(true)} variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Adaugă în masă
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adaugă Apartament
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Caută după număr sau proprietar..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {scari.length > 0 && (
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={filterScara}
            onChange={(e) => setFilterScara(e.target.value)}
          >
            <option value="ALL">Toate scările</option>
            {scari.map(s => (
              <option key={s.id} value={s.id}>Scara {s.numar}</option>
            ))}
            <option value="NONE">Fără scară</option>
          </select>
        )}
      </div>

      {/* Apartments List */}
      {filteredApartamente.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Home className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Niciun rezultat' : 'Nu există apartamente'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm
                ? 'Încearcă să modifici criteriile de căutare'
                : 'Adaugă primul apartament pentru a începe'}
            </p>
            {!searchTerm && (
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setShowBulkModal(true)} variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Adaugă în masă
                </Button>
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adaugă Apartament
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedApartamente).sort().map(([scaraName, apts]) => (
            <div key={scaraName}>
              {scari.length > 0 && (
                <h3 className="text-sm font-medium text-gray-500 mb-3 px-1">
                  {scaraName} ({apts.length})
                </h3>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {apts.sort((a, b) => {
                  const numA = parseInt(a.numar) || 0
                  const numB = parseInt(b.numar) || 0
                  return numA - numB
                }).map((apt) => (
                  <Card key={apt.id} className="hover:shadow-md transition-shadow group">
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-lg font-bold text-blue-600">{apt.numar}</span>
                          </div>
                          <div>
                            <h3 className="font-semibold">Apt. {apt.numar}</h3>
                            <p className="text-xs text-gray-500">
                              {apt.etaj !== null ? `Etaj ${apt.etaj}` : ''}
                              {apt.suprafata ? ` • ${apt.suprafata} mp` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingApt(apt)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(apt.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-gray-500">
                          <Users className="h-3.5 w-3.5" />
                          <span>{apt.nrPersoane} pers.</span>
                        </div>
                        {apt.cotaIndiviza && (
                          <span className="text-gray-500">{apt.cotaIndiviza}%</span>
                        )}
                      </div>

                      {apt.proprietari.length > 0 ? (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-xs text-gray-400 mb-1">Proprietar</div>
                          <div className="text-sm font-medium truncate">
                            {apt.proprietari[0].user.name || apt.proprietari[0].user.email}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 pt-3 border-t">
                          <Link href={`/dashboard/proprietari?apt=${apt.id}`}>
                            <Button variant="ghost" size="sm" className="w-full text-blue-600">
                              <Plus className="h-3 w-3 mr-1" />
                              Adaugă proprietar
                            </Button>
                          </Link>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddApartmentModal
          asociatieId={asociatieId}
          scari={scari}
          tipuriApartament={tipuriApartament}
          onClose={() => setShowAddModal(false)}
          onSuccess={(newApt) => {
            setApartamente([...apartamente, { ...newApt, proprietari: [] }])
            setShowAddModal(false)
          }}
          onAddTip={(tip) => setTipuriApartament([...tipuriApartament, tip])}
        />
      )}

      {/* Bulk Add Modal */}
      {showBulkModal && (
        <BulkAddModal
          asociatieId={asociatieId}
          scari={scari}
          onClose={() => setShowBulkModal(false)}
          onSuccess={(newApts) => {
            setApartamente([...apartamente, ...newApts.map(a => ({ ...a, proprietari: [] }))])
            setShowBulkModal(false)
          }}
        />
      )}

      {/* Edit Modal */}
      {editingApt && (
        <EditApartmentModal
          apartament={editingApt}
          scari={scari}
          tipuriApartament={tipuriApartament}
          onClose={() => setEditingApt(null)}
          onSuccess={(updated) => {
            setApartamente(apartamente.map(a => a.id === updated.id ? { ...a, ...updated } : a))
            setEditingApt(null)
          }}
          onAddTip={(tip) => setTipuriApartament([...tipuriApartament, tip])}
        />
      )}
    </div>
  )
}

function AddApartmentModal({
  asociatieId,
  scari,
  tipuriApartament,
  onClose,
  onSuccess,
  onAddTip,
}: {
  asociatieId: string
  scari: Scara[]
  tipuriApartament: TipApartament[]
  onClose: () => void
  onSuccess: (apt: Apartament) => void
  onAddTip: (tip: TipApartament) => void
}) {
  const [loading, setLoading] = useState(false)
  const [showAddTip, setShowAddTip] = useState(false)
  const [newTip, setNewTip] = useState({ denumire: '', nrCamere: 2, suprafata: 50, cotaIndiviza: 2.5 })
  const [formData, setFormData] = useState({
    numar: '',
    etaj: '',
    suprafata: '',
    nrCamere: '',
    nrPersoane: '1',
    cotaIndiviza: '',
    scaraId: '',
    tipApartamentId: '',
  })

  const handleSelectTip = (tipId: string) => {
    const tip = tipuriApartament.find(t => t.id === tipId)
    if (tip) {
      setFormData({
        ...formData,
        tipApartamentId: tipId,
        nrCamere: String(tip.nrCamere),
        suprafata: String(tip.suprafata),
        cotaIndiviza: String(tip.cotaIndiviza),
      })
    } else {
      setFormData({ ...formData, tipApartamentId: '' })
    }
  }

  const handleAddNewTip = async () => {
    if (!newTip.denumire) return
    try {
      const res = await fetch('/api/tipuri-apartament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTip, asociatieId }),
      })
      if (res.ok) {
        const data = await res.json()
        onAddTip(data.tip)
        handleSelectTip(data.tip.id)
        setShowAddTip(false)
        setNewTip({ denumire: '', nrCamere: 2, suprafata: 50, cotaIndiviza: 2.5 })
      }
    } catch (err) {
      console.error('Error adding tip:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/apartamente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numar: formData.numar,
          etaj: formData.etaj ? parseInt(formData.etaj) : null,
          suprafata: formData.suprafata ? parseFloat(formData.suprafata) : null,
          nrCamere: formData.nrCamere ? parseInt(formData.nrCamere) : null,
          nrPersoane: parseInt(formData.nrPersoane) || 1,
          cotaIndiviza: formData.cotaIndiviza ? parseFloat(formData.cotaIndiviza) : null,
          scaraId: formData.scaraId || undefined,
          asociatieId,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Eroare la creare')
      }

      const data = await res.json()
      const scara = scari.find(s => s.id === formData.scaraId)
      onSuccess({ ...data.apartament, scara: scara ? { numar: scara.numar } : null })
    } catch (err) {
      alert('Eroare: ' + (err instanceof Error ? err.message : 'Necunoscută'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Adaugă Apartament</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Număr *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.numar}
                  onChange={(e) => setFormData({ ...formData, numar: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Etaj
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.etaj}
                  onChange={(e) => setFormData({ ...formData, etaj: e.target.value })}
                />
              </div>
            </div>

            {scari.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scară
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.scaraId}
                  onChange={(e) => setFormData({ ...formData, scaraId: e.target.value })}
                >
                  <option value="">Fără scară</option>
                  {scari.map(s => (
                    <option key={s.id} value={s.id}>Scara {s.numar}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Tip Apartament Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tip apartament
              </label>
              <div className="flex gap-2">
                <select
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.tipApartamentId}
                  onChange={(e) => handleSelectTip(e.target.value)}
                >
                  <option value="">Selectează tipul...</option>
                  {tipuriApartament.map(tip => (
                    <option key={tip.id} value={tip.id}>
                      {tip.denumire} ({tip.nrCamere} cam, {tip.suprafata}mp, {tip.cotaIndiviza}%)
                    </option>
                  ))}
                </select>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddTip(!showAddTip)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {showAddTip && (
                <div className="mt-2 p-3 border rounded-lg bg-gray-50 space-y-2">
                  <input
                    type="text"
                    placeholder="Denumire (ex: 2 camere confort 1)"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                    value={newTip.denumire}
                    onChange={(e) => setNewTip({ ...newTip, denumire: e.target.value })}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="Camere"
                      className="px-2 py-1.5 text-sm border border-gray-300 rounded"
                      value={newTip.nrCamere}
                      onChange={(e) => setNewTip({ ...newTip, nrCamere: parseInt(e.target.value) || 1 })}
                    />
                    <input
                      type="number"
                      placeholder="mp"
                      className="px-2 py-1.5 text-sm border border-gray-300 rounded"
                      value={newTip.suprafata}
                      onChange={(e) => setNewTip({ ...newTip, suprafata: parseFloat(e.target.value) || 1 })}
                    />
                    <input
                      type="number"
                      placeholder="Cotă %"
                      step="0.01"
                      className="px-2 py-1.5 text-sm border border-gray-300 rounded"
                      value={newTip.cotaIndiviza}
                      onChange={(e) => setNewTip({ ...newTip, cotaIndiviza: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <Button type="button" size="sm" className="w-full" onClick={handleAddNewTip} disabled={!newTip.denumire}>
                    Adaugă tip nou
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Suprafață (mp)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.suprafata}
                  onChange={(e) => setFormData({ ...formData, suprafata: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Camere
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.nrCamere}
                  onChange={(e) => setFormData({ ...formData, nrCamere: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nr. Persoane
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.nrPersoane}
                  onChange={(e) => setFormData({ ...formData, nrPersoane: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cotă (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.cotaIndiviza}
                  onChange={(e) => setFormData({ ...formData, cotaIndiviza: e.target.value })}
                />
              </div>
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

function BulkAddModal({
  asociatieId,
  scari,
  onClose,
  onSuccess,
}: {
  asociatieId: string
  scari: Scara[]
  onClose: () => void
  onSuccess: (apts: Apartament[]) => void
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    start: '1',
    end: '10',
    prefix: '',
    scaraId: '',
    defaultPersons: '2',
  })

  const count = Math.max(0, (parseInt(formData.end) || 0) - (parseInt(formData.start) || 0) + 1)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (count <= 0 || count > 200) {
      alert('Numărul de apartamente trebuie să fie între 1 și 200')
      return
    }

    setLoading(true)

    try {
      const apartamente = []
      for (let i = parseInt(formData.start); i <= parseInt(formData.end); i++) {
        apartamente.push({
          numar: formData.prefix + i.toString(),
          nrPersoane: parseInt(formData.defaultPersons) || 2,
          scaraId: formData.scaraId || undefined,
        })
      }

      const res = await fetch('/api/apartamente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asociatieId,
          apartamente,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Eroare la creare')
      }

      const data = await res.json()
      const scara = scari.find(s => s.id === formData.scaraId)
      onSuccess(data.apartamente.map((a: Apartament) => ({
        ...a,
        scara: scara ? { numar: scara.numar } : null
      })))
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
            <h2 className="text-xl font-semibold">Adaugă apartamente în masă</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  De la nr.
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.start}
                  onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Până la nr.
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.end}
                  onChange={(e) => setFormData({ ...formData, end: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prefix (opțional)
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.prefix}
                onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                placeholder="ex: A pentru A1, A2..."
              />
            </div>

            {scari.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scară
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.scaraId}
                  onChange={(e) => setFormData({ ...formData, scaraId: e.target.value })}
                >
                  <option value="">Fără scară</option>
                  {scari.map(s => (
                    <option key={s.id} value={s.id}>Scara {s.numar}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nr. persoane implicit
              </label>
              <input
                type="number"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.defaultPersons}
                onChange={(e) => setFormData({ ...formData, defaultPersons: e.target.value })}
              />
            </div>

            <div className="bg-blue-50 rounded-lg p-4 text-sm">
              <p className="font-medium text-blue-900">
                Se vor crea {count} apartamente
              </p>
              <p className="text-blue-700 mt-1">
                {formData.prefix}{formData.start}, {formData.prefix}{parseInt(formData.start) + 1}, ..., {formData.prefix}{formData.end}
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Anulează
              </Button>
              <Button type="submit" className="flex-1" disabled={loading || count <= 0}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Adaugă ${count} apartamente`}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function EditApartmentModal({
  apartament,
  scari,
  tipuriApartament,
  onClose,
  onSuccess,
  onAddTip,
}: {
  apartament: Apartament
  scari: Scara[]
  tipuriApartament: TipApartament[]
  onClose: () => void
  onSuccess: (apt: Apartament) => void
  onAddTip: (tip: TipApartament) => void
}) {
  const [loading, setLoading] = useState(false)
  const [showAddTip, setShowAddTip] = useState(false)
  const [newTip, setNewTip] = useState({ denumire: '', nrCamere: 2, suprafata: 50, cotaIndiviza: 2.5 })
  const [formData, setFormData] = useState({
    numar: apartament.numar,
    etaj: apartament.etaj?.toString() || '',
    suprafata: apartament.suprafata?.toString() || '',
    nrCamere: apartament.nrCamere?.toString() || '',
    nrPersoane: apartament.nrPersoane.toString(),
    cotaIndiviza: apartament.cotaIndiviza?.toString() || '',
    scaraId: apartament.scaraId || '',
    tipApartamentId: (apartament as any).tipApartamentId || '',
  })

  const handleSelectTip = (tipId: string) => {
    const tip = tipuriApartament.find(t => t.id === tipId)
    if (tip) {
      setFormData({
        ...formData,
        tipApartamentId: tipId,
        nrCamere: String(tip.nrCamere),
        suprafata: String(tip.suprafata),
        cotaIndiviza: String(tip.cotaIndiviza),
      })
    } else {
      setFormData({ ...formData, tipApartamentId: '' })
    }
  }

  const handleAddNewTip = async () => {
    if (!newTip.denumire) return
    try {
      const res = await fetch('/api/tipuri-apartament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTip, asociatieId: apartament.asociatieId }),
      })
      if (res.ok) {
        const data = await res.json()
        onAddTip(data.tip)
        handleSelectTip(data.tip.id)
        setShowAddTip(false)
        setNewTip({ denumire: '', nrCamere: 2, suprafata: 50, cotaIndiviza: 2.5 })
      }
    } catch (err) {
      console.error('Error adding tip:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch(`/api/apartamente?id=${apartament.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numar: formData.numar,
          etaj: formData.etaj ? parseInt(formData.etaj) : null,
          suprafata: formData.suprafata ? parseFloat(formData.suprafata) : null,
          nrCamere: formData.nrCamere ? parseInt(formData.nrCamere) : null,
          nrPersoane: parseInt(formData.nrPersoane) || 1,
          cotaIndiviza: formData.cotaIndiviza ? parseFloat(formData.cotaIndiviza) : null,
          scaraId: formData.scaraId || null,
          tipApartamentId: formData.tipApartamentId || null,
        }),
      })

      if (!res.ok) throw new Error('Eroare la actualizare')

      const data = await res.json()
      const scara = scari.find(s => s.id === formData.scaraId)
      onSuccess({ ...data.apartament, scara: scara ? { numar: scara.numar } : null })
    } catch (err) {
      alert('Eroare: ' + (err instanceof Error ? err.message : 'Necunoscută'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Editează Apartament {apartament.numar}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Număr *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.numar}
                  onChange={(e) => setFormData({ ...formData, numar: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Etaj</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.etaj}
                  onChange={(e) => setFormData({ ...formData, etaj: e.target.value })}
                />
              </div>
            </div>

            {scari.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scară</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.scaraId}
                  onChange={(e) => setFormData({ ...formData, scaraId: e.target.value })}
                >
                  <option value="">Fără scară</option>
                  {scari.map(s => (
                    <option key={s.id} value={s.id}>Scara {s.numar}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Tip Apartament Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tip apartament</label>
              <div className="flex gap-2">
                <select
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.tipApartamentId}
                  onChange={(e) => handleSelectTip(e.target.value)}
                >
                  <option value="">Selectează tipul...</option>
                  {tipuriApartament.map(tip => (
                    <option key={tip.id} value={tip.id}>
                      {tip.denumire} ({tip.nrCamere} cam, {tip.suprafata}mp, {tip.cotaIndiviza}%)
                    </option>
                  ))}
                </select>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddTip(!showAddTip)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {showAddTip && (
                <div className="mt-2 p-3 border rounded-lg bg-gray-50 space-y-2">
                  <input
                    type="text"
                    placeholder="Denumire (ex: 2 camere confort 1)"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                    value={newTip.denumire}
                    onChange={(e) => setNewTip({ ...newTip, denumire: e.target.value })}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="Camere"
                      className="px-2 py-1.5 text-sm border border-gray-300 rounded"
                      value={newTip.nrCamere}
                      onChange={(e) => setNewTip({ ...newTip, nrCamere: parseInt(e.target.value) || 1 })}
                    />
                    <input
                      type="number"
                      placeholder="mp"
                      className="px-2 py-1.5 text-sm border border-gray-300 rounded"
                      value={newTip.suprafata}
                      onChange={(e) => setNewTip({ ...newTip, suprafata: parseFloat(e.target.value) || 1 })}
                    />
                    <input
                      type="number"
                      placeholder="Cotă %"
                      step="0.01"
                      className="px-2 py-1.5 text-sm border border-gray-300 rounded"
                      value={newTip.cotaIndiviza}
                      onChange={(e) => setNewTip({ ...newTip, cotaIndiviza: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <Button type="button" size="sm" className="w-full" onClick={handleAddNewTip} disabled={!newTip.denumire}>
                    Adaugă tip nou
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Suprafață (mp)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.suprafata}
                  onChange={(e) => setFormData({ ...formData, suprafata: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Camere</label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.nrCamere}
                  onChange={(e) => setFormData({ ...formData, nrCamere: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nr. Persoane</label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.nrPersoane}
                  onChange={(e) => setFormData({ ...formData, nrPersoane: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cotă (%)</label>
                <input
                  type="number"
                  step="0.01"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.cotaIndiviza}
                  onChange={(e) => setFormData({ ...formData, cotaIndiviza: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Anulează
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvează'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
