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
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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

interface Fond {
  id: string
  tip: 'RULMENT' | 'REPARATII' | 'ALTE'
  denumire: string
  sumaLunara: number
  soldCurent: number
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [asociatie, setAsociatie] = useState<Asociatie | null>(null)
  const [scari, setScari] = useState<Scara[]>([])
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState<Partial<Asociatie>>({})
  const [showAddScara, setShowAddScara] = useState(false)
  const [newScara, setNewScara] = useState({ numar: '', etaje: 10 })
  const [fonduri, setFonduri] = useState<Fond[]>([])
  const [showAddFond, setShowAddFond] = useState(false)
  const [newFond, setNewFond] = useState({ tip: 'RULMENT' as const, denumire: '', sumaLunara: 0 })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [cladireRes, fonduriRes] = await Promise.all([
        fetch('/api/cladire'),
        fetch('/api/fonduri')
      ])

      const cladireData = await cladireRes.json()
      const fonduriData = await fonduriRes.json()

      if (cladireData.asociatie) {
        setAsociatie(cladireData.asociatie)
        setFormData(cladireData.asociatie)
        setScari(cladireData.scari || [])
      }

      if (fonduriData.fonduri) {
        setFonduri(fonduriData.fonduri)
      }
    } catch (err) {
      console.error('Error:', err)
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
      }
    } catch (err) {
      console.error('Error saving:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddScara() {
    if (!asociatie || !newScara.numar) return

    try {
      const res = await fetch('/api/scari', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newScara,
          asociatieId: asociatie.id
        })
      })

      if (res.ok) {
        const data = await res.json()
        setScari([...scari, { ...data.scara, _count: { apartamente: 0 } }])
        setNewScara({ numar: '', etaje: 10 })
        setShowAddScara(false)
      }
    } catch (err) {
      console.error('Error adding scara:', err)
    }
  }

  async function handleDeleteScara(scaraId: string) {
    if (!confirm('Sigur vrei să ștergi această scară? Apartamentele asociate vor fi dezasociate.')) return

    try {
      await fetch(`/api/scari?id=${scaraId}`, { method: 'DELETE' })
      setScari(scari.filter(s => s.id !== scaraId))
    } catch (err) {
      console.error('Error deleting scara:', err)
    }
  }

  async function handleAddFond() {
    if (!newFond.denumire || newFond.sumaLunara <= 0) return

    try {
      const res = await fetch('/api/fonduri', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFond)
      })

      if (res.ok) {
        const data = await res.json()
        setFonduri([...fonduri, data.fond])
        setNewFond({ tip: 'RULMENT', denumire: '', sumaLunara: 0 })
        setShowAddFond(false)
      }
    } catch (err) {
      console.error('Error adding fond:', err)
    }
  }

  async function handleDeleteFond(fondId: string) {
    if (!confirm('Sigur vrei să ștergi acest fond?')) return

    try {
      await fetch(`/api/fonduri?id=${fondId}`, { method: 'DELETE' })
      setFonduri(fonduri.filter(f => f.id !== fondId))
    } catch (err) {
      console.error('Error deleting fond:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!asociatie) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nu ai configurat încă asociația
            </h3>
            <p className="text-gray-500 mb-4">
              Mergi la Dashboard pentru a crea asociația.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

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
            <Button variant="outline" onClick={() => { setEditMode(false); setFormData(asociatie) }}>
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
                  <div className="font-medium">{asociatie.nume}</div>
                </div>
                {asociatie.cui && (
                  <div>
                    <div className="text-sm text-gray-500">CUI</div>
                    <div className="font-medium">{asociatie.cui}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Adresă
                  </div>
                  <div className="font-medium">
                    {asociatie.adresa}, {asociatie.oras}, {asociatie.judet}
                    {asociatie.codPostal && `, ${asociatie.codPostal}`}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                {asociatie.email && (
                  <div>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Email
                    </div>
                    <div className="font-medium">{asociatie.email}</div>
                  </div>
                )}
                {asociatie.telefon && (
                  <div>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Telefon
                    </div>
                    <div className="font-medium">{asociatie.telefon}</div>
                  </div>
                )}
                {asociatie.contBancar && (
                  <div>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <CreditCard className="h-3 w-3" /> Cont bancar
                    </div>
                    <div className="font-medium font-mono text-sm">
                      {asociatie.contBancar}
                      {asociatie.banca && <span className="text-gray-500"> ({asociatie.banca})</span>}
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
                  <div className="font-semibold text-lg">{asociatie.ziScadenta}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Percent className="h-8 w-8 text-orange-600" />
                <div>
                  <div className="text-sm text-gray-500">Penalizare/zi</div>
                  <div className="font-semibold text-lg">{(asociatie.penalizareZi * 100).toFixed(2)}%</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scari (Building Sections) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-blue-600" />
                Scări / Intrări
              </CardTitle>
              <CardDescription>
                {scari.length === 0
                  ? 'Opțional: Adaugă scări dacă blocul are mai multe intrări'
                  : `${scari.length} scări configurate`}
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddScara(true)} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adaugă scară
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {scari.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Building className="h-12 w-12 mx-auto text-gray-300 mb-2" />
              <p>Nu ai configurat scări.</p>
              <p className="text-sm">Dacă blocul are o singură intrare, nu este necesar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scari.map((scara) => (
                <div
                  key={scara.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="font-bold text-blue-600">{scara.numar}</span>
                    </div>
                    <div>
                      <div className="font-medium">Scara {scara.numar}</div>
                      <div className="text-sm text-gray-500">
                        {scara.etaje} etaje • {scara._count.apartamente} apartamente
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteScara(scara.id)}
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
            <Button onClick={() => setShowAddFond(true)} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adaugă fond
            </Button>
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
                  onClick={() => setShowAddScara(false)}
                >
                  Anulează
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAddScara}
                  disabled={!newScara.numar}
                >
                  Adaugă
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
