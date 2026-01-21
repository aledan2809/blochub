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
  Building
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Proprietar {
  id: string
  cotaParte: number
  esteActiv: boolean
  user: {
    id: string
    name: string | null
    email: string
    phone: string | null
  }
  apartament: {
    id: string
    numar: string
    scara: { numar: string } | null
  }
}

interface Apartament {
  id: string
  numar: string
  scara: { numar: string } | null
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
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [asociatieId, setAsociatieId] = useState<string | null>(null)

  // Modals
  const [showAddModal, setShowAddModal] = useState(!!preselectedAptId)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProprietar, setEditingProprietar] = useState<Proprietar | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    apartamentId: preselectedAptId || '',
    name: '',
    email: '',
    phone: '',
    cotaParte: 100
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
      const [propRes, aptRes] = await Promise.all([
        fetch('/api/proprietari'),
        fetch('/api/apartamente')
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
          cotaParte: 100
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
          esteActiv: editingProprietar.esteActiv
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
      cotaParte: prop.cotaParte
    })
    setShowEditModal(true)
  }

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
            .map(({ apartament, proprietari: props }) => (
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
              </div>
            ))}
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
    </div>
  )
}
