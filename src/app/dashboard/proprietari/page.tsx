'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Home,
  Edit2,
  Trash2,
  X,
  UserPlus,
  Check,
  AlertCircle,
  Building,
  UserCheck,
  Bell,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Proprietar {
  id: string
  cotaParte: number
  esteActiv: boolean
  esteContactUrgenta: boolean
  user: {
    id: string
    name: string | null
    email: string
    phone: string | null
  }
  apartament: {
    id: string
    numar: string
    esteInchiriat: boolean
    scara: { numar: string } | null
  }
}

interface Chirias {
  id: string
  nume: string
  email: string | null
  telefon: string | null
  esteActiv: boolean
  esteContactUrgenta: boolean
  apartamentId: string
}

interface Apartament {
  id: string
  numar: string
  esteInchiriat: boolean
  scara: { numar: string } | null
  chiriasi?: Chirias[]
}

export default function ProprietariPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ProprietariContent />
    </Suspense>
  )
}

function ProprietariContent() {
  const searchParams = useSearchParams()
  const preselectedAptId = searchParams.get('apt')

  const [proprietari, setProprietari] = useState<Proprietar[]>([])
  const [apartamente, setApartamente] = useState<Apartament[]>([])
  const [chiriasi, setChiriasi] = useState<Chirias[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [asociatieId, setAsociatieId] = useState<string | null>(null)

  // Modals
  const [showAddModal, setShowAddModal] = useState(!!preselectedAptId)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showChiriasModal, setShowChiriasModal] = useState(false)
  const [editingProprietar, setEditingProprietar] = useState<Proprietar | null>(null)
  const [editingChirias, setEditingChirias] = useState<Chirias | null>(null)
  const [selectedAptForChirias, setSelectedAptForChirias] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    apartamentId: preselectedAptId || '',
    name: '',
    email: '',
    phone: '',
    cotaParte: 100,
    esteContactUrgenta: false,
  })

  // Chirias form state
  const [chiriasForm, setChiriasForm] = useState({
    nume: '',
    email: '',
    telefon: '',
    esteContactUrgenta: false,
  })

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (preselectedAptId && apartamente.length > 0) {
      setFormData(prev => ({ ...prev, apartamentId: preselectedAptId }))
      setShowAddModal(true)
    }
  }, [preselectedAptId, apartamente])

  const fetchData = async () => {
    try {
      const [propRes, aptRes, chiriasRes] = await Promise.all([
        fetch('/api/proprietari'),
        fetch('/api/apartamente'),
        fetch('/api/chiriasi')
      ])

      if (propRes.ok) {
        const propData = await propRes.json()
        setProprietari(propData.proprietari || [])
        setAsociatieId(propData.asociatieId)
      }

      if (aptRes.ok) {
        const aptData = await aptRes.json()
        setApartamente(aptData.apartamente || [])
      }

      if (chiriasRes.ok) {
        const chiriasData = await chiriasRes.json()
        setChiriasi(chiriasData.chiriasi || [])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!formData.apartamentId || !formData.email) return

    try {
      const res = await fetch('/api/proprietari', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        const data = await res.json()
        setProprietari([...proprietari, data.proprietar])
        setShowAddModal(false)
        setFormData({
          apartamentId: '',
          name: '',
          email: '',
          phone: '',
          cotaParte: 100,
          esteContactUrgenta: false,
        })
      }
    } catch (error) {
      console.error('Failed to add proprietar:', error)
    }
  }

  const handleEdit = async () => {
    if (!editingProprietar) return

    try {
      const res = await fetch('/api/proprietari', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProprietar.id,
          name: formData.name,
          phone: formData.phone,
          cotaParte: formData.cotaParte,
          esteActiv: editingProprietar.esteActiv,
          esteContactUrgenta: formData.esteContactUrgenta,
        })
      })

      if (res.ok) {
        const data = await res.json()
        setProprietari(proprietari.map(p =>
          p.id === editingProprietar.id ? data.proprietar : p
        ))
        setShowEditModal(false)
        setEditingProprietar(null)
      }
    } catch (error) {
      console.error('Failed to update proprietar:', error)
    }
  }

  // Toggle esteInchiriat for apartment
  const handleToggleInchiriat = async (aptId: string, currentValue: boolean) => {
    try {
      const res = await fetch(`/api/apartamente?id=${aptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ esteInchiriat: !currentValue })
      })

      if (res.ok) {
        setApartamente(apartamente.map(a =>
          a.id === aptId ? { ...a, esteInchiriat: !currentValue } : a
        ))
        // Also update in proprietari data
        setProprietari(proprietari.map(p =>
          p.apartament.id === aptId
            ? { ...p, apartament: { ...p.apartament, esteInchiriat: !currentValue } }
            : p
        ))
      }
    } catch (error) {
      console.error('Failed to update apartment:', error)
    }
  }

  // Chirias CRUD
  const handleAddChirias = async () => {
    if (!selectedAptForChirias || !chiriasForm.nume) return

    try {
      const res = await fetch('/api/chiriasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...chiriasForm,
          apartamentId: selectedAptForChirias,
        })
      })

      if (res.ok) {
        const data = await res.json()
        setChiriasi([...chiriasi, data.chirias])
        setShowChiriasModal(false)
        setChiriasForm({ nume: '', email: '', telefon: '', esteContactUrgenta: false })
        setSelectedAptForChirias(null)
        setEditingChirias(null)
      }
    } catch (error) {
      console.error('Failed to add chirias:', error)
    }
  }

  const handleEditChirias = async () => {
    if (!editingChirias) return

    try {
      const res = await fetch(`/api/chiriasi?id=${editingChirias.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chiriasForm)
      })

      if (res.ok) {
        const data = await res.json()
        setChiriasi(chiriasi.map(c =>
          c.id === editingChirias.id ? data.chirias : c
        ))
        setShowChiriasModal(false)
        setEditingChirias(null)
        setChiriasForm({ nume: '', email: '', telefon: '', esteContactUrgenta: false })
      }
    } catch (error) {
      console.error('Failed to update chirias:', error)
    }
  }

  const handleDeleteChirias = async (id: string) => {
    if (!confirm('Sigur doriți să eliminați acest chiriaș?')) return

    try {
      const res = await fetch(`/api/chiriasi?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setChiriasi(chiriasi.filter(c => c.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete chirias:', error)
    }
  }

  const openChiriasModal = (aptId: string, chirias?: Chirias) => {
    setSelectedAptForChirias(aptId)
    if (chirias) {
      setEditingChirias(chirias)
      setChiriasForm({
        nume: chirias.nume,
        email: chirias.email || '',
        telefon: chirias.telefon || '',
        esteContactUrgenta: chirias.esteContactUrgenta,
      })
    } else {
      setEditingChirias(null)
      setChiriasForm({ nume: '', email: '', telefon: '', esteContactUrgenta: false })
    }
    setShowChiriasModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Sigur doriți să eliminați acest proprietar?')) return

    try {
      const res = await fetch(`/api/proprietari?id=${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setProprietari(proprietari.filter(p => p.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete proprietar:', error)
    }
  }

  const openEditModal = (prop: Proprietar) => {
    setEditingProprietar(prop)
    setFormData({
      apartamentId: prop.apartament.id,
      name: prop.user.name || '',
      email: prop.user.email,
      phone: prop.user.phone || '',
      cotaParte: prop.cotaParte,
      esteContactUrgenta: prop.esteContactUrgenta || false,
    })
    setShowEditModal(true)
  }

  // Get chiriasi for an apartment
  const getChiriasiForApt = (aptId: string) => chiriasi.filter(c => c.apartamentId === aptId && c.esteActiv)

  // Filter proprietari
  const filtered = proprietari.filter(p => {
    const term = searchTerm.toLowerCase()
    return (
      p.user.name?.toLowerCase().includes(term) ||
      p.user.email.toLowerCase().includes(term) ||
      p.apartament.numar.toLowerCase().includes(term)
    )
  })

  // Group by apartment
  const groupedByApt = filtered.reduce((acc, prop) => {
    const key = prop.apartament.id
    if (!acc[key]) {
      acc[key] = {
        apartament: prop.apartament,
        proprietari: []
      }
    }
    acc[key].proprietari.push(prop)
    return acc
  }, {} as Record<string, { apartament: Proprietar['apartament']; proprietari: Proprietar[] }>)

  // Get apartments without proprietari
  const apartamenteFaraProprietar = apartamente.filter(
    apt => !proprietari.some(p => p.apartament.id === apt.id)
  )

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
            <Users className="h-7 w-7 text-blue-600" />
            Proprietari
          </h1>
          <p className="text-gray-600 mt-1">
            Gestionează datele proprietarilor din asociație
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Adaugă proprietar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{proprietari.length}</p>
              <p className="text-sm text-gray-500">Total proprietari</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {proprietari.filter(p => p.esteActiv).length}
              </p>
              <p className="text-sm text-gray-500">Activi</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{apartamenteFaraProprietar.length}</p>
              <p className="text-sm text-gray-500">Apt. fără proprietar</p>
            </div>
          </div>
        </div>
      </div>

      {/* Apartments without owners warning */}
      {apartamenteFaraProprietar.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-orange-900">
                {apartamenteFaraProprietar.length} apartamente fără proprietar
              </h3>
              <p className="text-sm text-orange-700 mt-1">
                Apartamentele:{' '}
                {apartamenteFaraProprietar.slice(0, 5).map(a => a.numar).join(', ')}
                {apartamenteFaraProprietar.length > 5 && ` și încă ${apartamenteFaraProprietar.length - 5}`}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  if (apartamenteFaraProprietar.length > 0) {
                    setFormData(prev => ({
                      ...prev,
                      apartamentId: apartamenteFaraProprietar[0].id
                    }))
                    setShowAddModal(true)
                  }
                }}
              >
                Adaugă primul proprietar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Caută după nume, email sau apartament..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Proprietari List */}
      {Object.keys(groupedByApt).length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'Nu s-au găsit rezultate' : 'Nu există proprietari'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm
              ? 'Încercați alte criterii de căutare'
              : 'Adăugați primul proprietar pentru a începe'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setShowAddModal(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Adaugă proprietar
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {Object.values(groupedByApt)
            .sort((a, b) => {
              const numA = parseInt(a.apartament.numar) || 0
              const numB = parseInt(b.apartament.numar) || 0
              return numA - numB
            })
            .map(({ apartament, proprietari: props }) => {
              const aptChiriasi = getChiriasiForApt(apartament.id)
              const isInchiriat = apartamente.find(a => a.id === apartament.id)?.esteInchiriat || apartament.esteInchiriat

              return (
              <div key={apartament.id} className="bg-white rounded-xl border overflow-hidden">
                {/* Apartment header */}
                <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-3">
                  <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Home className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">
                      Apartament {apartament.numar}
                    </span>
                    {apartament.scara && (
                      <span className="text-gray-500 text-sm ml-2">
                        Scara {apartament.scara.numar}
                      </span>
                    )}
                    {isInchiriat && (
                      <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                        Închiriat
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, apartamentId: apartament.id }))
                      setShowAddModal(true)
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Proprietari list */}
                <div className="divide-y">
                  {props.map((prop) => (
                    <div key={prop.id} className="p-4 flex items-center gap-4">
                      <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {prop.user.name
                            ? prop.user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                            : prop.user.email.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">
                          {prop.user.name || 'Fără nume'}
                          {!prop.esteActiv && (
                            <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              Inactiv
                            </span>
                          )}
                          {prop.cotaParte < 100 && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                              {prop.cotaParte}%
                            </span>
                          )}
                          {prop.esteContactUrgenta && (
                            <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded inline-flex items-center gap-1">
                              <Bell className="h-3 w-3" />
                              Contact urgență
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {prop.user.email}
                          </span>
                          {prop.user.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {prop.user.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(prop)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(prop.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Închiriat toggle and Chiriași section */}
                <div className="border-t bg-gray-50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInchiriat}
                        onChange={() => handleToggleInchiriat(apartament.id, isInchiriat)}
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Locuit de chiriaș(i)
                      </span>
                    </label>
                    {isInchiriat && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openChiriasModal(apartament.id)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Adaugă chiriaș
                      </Button>
                    )}
                  </div>

                  {/* Chiriași list */}
                  {isInchiriat && aptChiriasi.length > 0 && (
                    <div className="space-y-2">
                      {aptChiriasi.map(chirias => (
                        <div key={chirias.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border">
                          <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                              {chirias.nume}
                              {chirias.esteContactUrgenta && (
                                <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                                  <Bell className="h-2.5 w-2.5" />
                                  Urgență
                                </span>
                              )}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              {chirias.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-2.5 w-2.5" />
                                  {chirias.email}
                                </span>
                              )}
                              {chirias.telefon && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-2.5 w-2.5" />
                                  {chirias.telefon}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => openChiriasModal(apartament.id, chirias)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteChirias(chirias.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isInchiriat && aptChiriasi.length === 0 && (
                    <p className="text-sm text-gray-500 italic">
                      Niciun chiriaș adăugat. Adaugă datele chiriașului pentru notificări de urgență.
                    </p>
                  )}
                </div>
              </div>
              )
            })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Adaugă proprietar</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apartament *
                </label>
                <select
                  value={formData.apartamentId}
                  onChange={(e) => setFormData({ ...formData, apartamentId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selectează apartament</option>
                  {apartamente
                    .sort((a, b) => {
                      const numA = parseInt(a.numar) || 0
                      const numB = parseInt(b.numar) || 0
                      return numA - numB
                    })
                    .map(apt => (
                      <option key={apt.id} value={apt.id}>
                        Apt. {apt.numar}
                        {apt.scara && ` (Scara ${apt.scara.numar})`}
                        {!proprietari.some(p => p.apartament.id === apt.id) && ' - fără proprietar'}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nume complet
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ion Popescu"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ion.popescu@email.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Proprietarul va primi notificări la această adresă
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0722 123 456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cotă parte (%)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={formData.cotaParte}
                  onChange={(e) => setFormData({ ...formData, cotaParte: parseInt(e.target.value) || 100 })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Procent din proprietate (util pentru coproprietari)
                </p>
              </div>

              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <input
                  type="checkbox"
                  id="add-contact-urgenta"
                  checked={formData.esteContactUrgenta}
                  onChange={(e) => setFormData({ ...formData, esteContactUrgenta: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="add-contact-urgenta" className="flex-1 cursor-pointer">
                  <span className="text-sm font-medium text-orange-900 flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Contact de urgență
                  </span>
                  <p className="text-xs text-orange-700 mt-0.5">
                    Va primi notificări email/SMS în caz de avarii sau urgențe
                  </p>
                </label>
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
                className="flex-1"
                onClick={handleAdd}
                disabled={!formData.apartamentId || !formData.email}
              >
                Adaugă
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingProprietar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEditModal(false)} />
          <div className="relative bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Editează proprietar</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                <Home className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium">
                    Apartament {editingProprietar.apartament.numar}
                  </p>
                  <p className="text-xs text-gray-500">
                    {editingProprietar.user.email}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nume complet
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ion Popescu"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0722 123 456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cotă parte (%)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={formData.cotaParte}
                  onChange={(e) => setFormData({ ...formData, cotaParte: parseInt(e.target.value) || 100 })}
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <input
                  type="checkbox"
                  id="edit-contact-urgenta"
                  checked={formData.esteContactUrgenta}
                  onChange={(e) => setFormData({ ...formData, esteContactUrgenta: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="edit-contact-urgenta" className="flex-1 cursor-pointer">
                  <span className="text-sm font-medium text-orange-900 flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Contact de urgență
                  </span>
                  <p className="text-xs text-orange-700 mt-0.5">
                    Va primi notificări email/SMS în caz de avarii sau urgențe
                  </p>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowEditModal(false)}
              >
                Anulează
              </Button>
              <Button className="flex-1" onClick={handleEdit}>
                Salvează
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Chirias Modal */}
      {showChiriasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowChiriasModal(false)} />
          <div className="relative bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {editingChirias ? 'Editează chiriaș' : 'Adaugă chiriaș'}
              </h2>
              <button
                onClick={() => setShowChiriasModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nume complet *
                </label>
                <Input
                  value={chiriasForm.nume}
                  onChange={(e) => setChiriasForm({ ...chiriasForm, nume: e.target.value })}
                  placeholder="Ion Popescu"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={chiriasForm.email}
                  onChange={(e) => setChiriasForm({ ...chiriasForm, email: e.target.value })}
                  placeholder="ion.popescu@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <Input
                  type="tel"
                  value={chiriasForm.telefon}
                  onChange={(e) => setChiriasForm({ ...chiriasForm, telefon: e.target.value })}
                  placeholder="0722 123 456"
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <input
                  type="checkbox"
                  id="chirias-contact-urgenta"
                  checked={chiriasForm.esteContactUrgenta}
                  onChange={(e) => setChiriasForm({ ...chiriasForm, esteContactUrgenta: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="chirias-contact-urgenta" className="flex-1 cursor-pointer">
                  <span className="text-sm font-medium text-orange-900 flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Contact de urgență
                  </span>
                  <p className="text-xs text-orange-700 mt-0.5">
                    Va primi notificări în caz de avarii sau urgențe
                  </p>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowChiriasModal(false)}
              >
                Anulează
              </Button>
              <Button
                className="flex-1"
                onClick={editingChirias ? handleEditChirias : handleAddChirias}
                disabled={!chiriasForm.nume}
              >
                {editingChirias ? 'Salvează' : 'Adaugă'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
