'use client'

import { useEffect, useState } from 'react'
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Loader2,
  Home,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Apartament {
  id: string
  numar: string
  etaj: number | null
  suprafata: number | null
  nrCamere: number | null
  nrPersoane: number
  cotaIndiviza: number | null
  proprietari: Array<{
    user: {
      name: string | null
      email: string
    }
  }>
}

export default function ApartamentePage() {
  const [apartamente, setApartamente] = useState<Apartament[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [asociatieId, setAsociatieId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        // First get association
        const statsRes = await fetch('/api/dashboard/stats')
        const statsData = await statsRes.json()

        if (!statsData.hasAsociatie) {
          setLoading(false)
          return
        }

        setAsociatieId(statsData.asociatie.id)

        // Then get apartments
        const res = await fetch(`/api/apartamente?asociatieId=${statsData.asociatie.id}`)
        const data = await res.json()
        setApartamente(data.apartamente || [])
      } catch (err) {
        console.error('Error fetching apartments:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const filteredApartamente = apartamente.filter(apt =>
    apt.numar.toLowerCase().includes(searchTerm.toLowerCase()) ||
    apt.proprietari.some(p =>
      p.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
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
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adaugă Apartament
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Caută după număr sau proprietar..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Apartments Grid */}
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
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adaugă Apartament
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApartamente.map((apt) => (
            <Card key={apt.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl font-bold text-blue-600">{apt.numar}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">Apartament {apt.numar}</h3>
                      {apt.etaj !== null && (
                        <p className="text-sm text-gray-500">Etaj {apt.etaj}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {apt.suprafata && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Suprafață</span>
                      <span className="font-medium">{apt.suprafata} mp</span>
                    </div>
                  )}
                  {apt.nrCamere && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Camere</span>
                      <span className="font-medium">{apt.nrCamere}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Persoane</span>
                    <span className="font-medium">{apt.nrPersoane}</span>
                  </div>
                  {apt.cotaIndiviza && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Cotă indiviză</span>
                      <span className="font-medium">{apt.cotaIndiviza}%</span>
                    </div>
                  )}
                </div>

                {apt.proprietari.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <Users className="h-4 w-4" />
                      <span>Proprietari</span>
                    </div>
                    {apt.proprietari.map((prop, i) => (
                      <div key={i} className="text-sm">
                        <p className="font-medium">{prop.user.name || 'Nespecificat'}</p>
                        <p className="text-gray-500">{prop.user.email}</p>
                      </div>
                    ))}
                  </div>
                )}

                {apt.proprietari.length === 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-400 italic">Fără proprietar asociat</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddApartmentModal
          asociatieId={asociatieId!}
          onClose={() => setShowAddModal(false)}
          onSuccess={(newApt) => {
            setApartamente([...apartamente, newApt])
            setShowAddModal(false)
          }}
        />
      )}
    </div>
  )
}

function AddApartmentModal({
  asociatieId,
  onClose,
  onSuccess,
}: {
  asociatieId: string
  onClose: () => void
  onSuccess: (apt: Apartament) => void
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    numar: '',
    etaj: '',
    suprafata: '',
    nrCamere: '',
    nrPersoane: '1',
    cotaIndiviza: '',
  })

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
          asociatieId,
        }),
      })

      if (!res.ok) throw new Error('Eroare la creare')

      const data = await res.json()
      onSuccess({ ...data.apartament, proprietari: [] })
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
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Număr apartament *
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.numar}
                onChange={(e) => setFormData({ ...formData, numar: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nr. Camere
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
                  Cotă indiviză (%)
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

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Anulează
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Adaugă'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
