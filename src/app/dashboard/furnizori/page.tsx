'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAsociatie } from '@/contexts/AsociatieContext'

// Alias pentru consistență
const useCurrentAsociatie = () => {
  const ctx = useAsociatie()
  return { selectedAsociatie: ctx.currentAsociatie, ...ctx }
}
import {
  Search,
  Plus,
  Building2,
  Phone,
  Mail,
  CreditCard,
  MapPin,
  Edit,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileText,
  Eye,
} from 'lucide-react'
import { AnafVerificationModal } from '@/components/AnafVerificationModal'

interface Furnizor {
  id: string
  nume: string
  cui: string | null
  contBancar: string | null
  adresa: string | null
  telefon: string | null
  email: string | null
}

interface FurnizorFormData {
  nume: string
  cui: string
  contBancar: string
  adresa: string
  telefon: string
  email: string
}

const emptyFormData: FurnizorFormData = {
  nume: '',
  cui: '',
  contBancar: '',
  adresa: '',
  telefon: '',
  email: '',
}

export default function FurnizoriPage() {
  const { selectedAsociatie } = useCurrentAsociatie()
  const [furnizori, setFurnizori] = useState<Furnizor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedFurnizor, setSelectedFurnizor] = useState<Furnizor | null>(null)
  const [formData, setFormData] = useState<FurnizorFormData>(emptyFormData)
  const [formErrors, setFormErrors] = useState<Partial<FurnizorFormData>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // ANAF verification states
  const [verificandANAF, setVerificandANAF] = useState(false)
  const [anafResult, setAnafResult] = useState<{ found: boolean; firma?: { denumire: string; adresa: string; telefon: string | null } } | null>(null)
  const [showAnafModal, setShowAnafModal] = useState(false)
  const [anafModalCui, setAnafModalCui] = useState<string>('')

  const fetchFurnizori = useCallback(async () => {
    if (!selectedAsociatie?.id) return

    setLoading(true)
    try {
      const res = await fetch(`/api/furnizori?asociatieId=${selectedAsociatie.id}`)
      const data = await res.json()
      if (res.ok) {
        setFurnizori(data.furnizori || [])
      } else {
        setError(data.error || 'Eroare la încărcarea furnizorilor')
      }
    } catch (err) {
      console.error('Error fetching furnizori:', err)
      setError('Eroare la încărcarea furnizorilor')
    } finally {
      setLoading(false)
    }
  }, [selectedAsociatie?.id])

  useEffect(() => {
    fetchFurnizori()
  }, [fetchFurnizori])

  // Auto-hide success message
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  // Filter furnizori based on search
  const filteredFurnizori = furnizori.filter(f => {
    const query = searchQuery.toLowerCase()
    return (
      f.nume.toLowerCase().includes(query) ||
      (f.cui && f.cui.toLowerCase().includes(query)) ||
      (f.email && f.email.toLowerCase().includes(query)) ||
      (f.telefon && f.telefon.includes(query))
    )
  })

  // Validate form
  const validateForm = (): boolean => {
    const errors: Partial<FurnizorFormData> = {}
    if (!formData.nume.trim()) {
      errors.nume = 'Numele este obligatoriu'
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email invalid'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Verify CUI with ANAF
  const verificaANAF = async () => {
    if (!formData.cui.trim()) return

    setVerificandANAF(true)
    setAnafResult(null)

    try {
      const res = await fetch('/api/verificare-anaf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cui: formData.cui })
      })
      const data = await res.json()

      if (res.ok && data.found) {
        setAnafResult({ found: true, firma: data.firma })
        // Auto-fill from ANAF data
        setFormData(prev => ({
          ...prev,
          nume: data.firma.denumire || prev.nume,
          adresa: data.firma.adresa || prev.adresa,
          telefon: data.firma.telefon || prev.telefon,
        }))
      } else {
        setAnafResult({ found: false })
      }
    } catch (err) {
      console.error('ANAF verification error:', err)
      setAnafResult({ found: false })
    } finally {
      setVerificandANAF(false)
    }
  }

  // Open add modal
  const openAddModal = () => {
    setFormData(emptyFormData)
    setFormErrors({})
    setAnafResult(null)
    setShowAddModal(true)
  }

  // Open edit modal
  const openEditModal = (furnizor: Furnizor) => {
    setSelectedFurnizor(furnizor)
    setFormData({
      nume: furnizor.nume,
      cui: furnizor.cui || '',
      contBancar: furnizor.contBancar || '',
      adresa: furnizor.adresa || '',
      telefon: furnizor.telefon || '',
      email: furnizor.email || '',
    })
    setFormErrors({})
    setAnafResult(null)
    setShowEditModal(true)
  }

  // Open delete confirmation
  const openDeleteConfirm = (furnizor: Furnizor) => {
    setSelectedFurnizor(furnizor)
    setShowDeleteConfirm(true)
  }

  // Close all modals
  const closeModals = () => {
    setShowAddModal(false)
    setShowEditModal(false)
    setShowDeleteConfirm(false)
    setSelectedFurnizor(null)
    setFormData(emptyFormData)
    setFormErrors({})
    setAnafResult(null)
  }

  // Handle form submit (add/edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm() || !selectedAsociatie?.id) return

    setSaving(true)
    setError(null)

    try {
      const isEdit = showEditModal && selectedFurnizor
      const url = '/api/furnizori'
      const method = isEdit ? 'PUT' : 'POST'
      const body = isEdit
        ? { id: selectedFurnizor.id, ...formData }
        : { ...formData, asociatieId: selectedAsociatie.id }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(isEdit ? 'Furnizor actualizat cu succes!' : 'Furnizor adăugat cu succes!')
        closeModals()
        fetchFurnizori()
      } else {
        setError(data.error || 'Eroare la salvarea furnizorului')
      }
    } catch (err) {
      console.error('Error saving furnizor:', err)
      setError('Eroare la salvarea furnizorului')
    } finally {
      setSaving(false)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!selectedFurnizor) return

    setDeleting(true)
    setError(null)

    try {
      const res = await fetch(`/api/furnizori?id=${selectedFurnizor.id}`, {
        method: 'DELETE'
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess('Furnizor șters cu succes!')
        closeModals()
        fetchFurnizori()
      } else {
        setError(data.error || 'Eroare la ștergerea furnizorului')
      }
    } catch (err) {
      console.error('Error deleting furnizor:', err)
      setError('Eroare la ștergerea furnizorului')
    } finally {
      setDeleting(false)
    }
  }

  if (!selectedAsociatie) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Selectează o asociație pentru a vedea furnizorii</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Furnizori</h1>
          <p className="text-gray-600 mt-1">
            Gestionează furnizorii asociației
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Adaugă furnizor
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total furnizori</p>
              <p className="text-2xl font-bold text-gray-900">{furnizori.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CreditCard className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Cu IBAN</p>
              <p className="text-2xl font-bold text-gray-900">
                {furnizori.filter(f => f.contBancar).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Cu CUI</p>
              <p className="text-2xl font-bold text-gray-900">
                {furnizori.filter(f => f.cui).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Caută după nume, CUI, email sau telefon..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Furnizori List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filteredFurnizori.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'Niciun furnizor găsit' : 'Niciun furnizor adăugat'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchQuery
              ? 'Încearcă cu alți termeni de căutare'
              : 'Adaugă primul furnizor pentru a începe'}
          </p>
          {!searchQuery && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Adaugă furnizor
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredFurnizori.map((furnizor) => (
            <div
              key={furnizor.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{furnizor.nume}</h3>
                      {furnizor.cui && (
                        <span className="text-sm text-gray-500">CUI: {furnizor.cui}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                    {furnizor.contBancar && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CreditCard className="h-4 w-4 text-gray-400" />
                        <span className="truncate">{furnizor.contBancar}</span>
                      </div>
                    )}
                    {furnizor.telefon && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{furnizor.telefon}</span>
                      </div>
                    )}
                    {furnizor.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="truncate">{furnizor.email}</span>
                      </div>
                    )}
                    {furnizor.adresa && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="truncate">{furnizor.adresa}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {furnizor.cui && (
                    <button
                      onClick={() => {
                        setAnafModalCui(furnizor.cui!)
                        setShowAnafModal(true)
                      }}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Verifică ANAF"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(furnizor)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editează"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => openDeleteConfirm(furnizor)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Șterge"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                {showEditModal ? 'Editează furnizor' : 'Adaugă furnizor'}
              </h2>
              <button
                onClick={closeModals}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* CUI with ANAF verification */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CUI (Cod Unic de Înregistrare)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.cui}
                    onChange={(e) => setFormData({ ...formData, cui: e.target.value })}
                    placeholder="ex: RO12345678"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={verificaANAF}
                    disabled={!formData.cui.trim() || verificandANAF}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    title="Auto-completează datele din ANAF"
                  >
                    {verificandANAF ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      'Completează'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAnafModalCui(formData.cui)
                      setShowAnafModal(true)
                    }}
                    disabled={!formData.cui.trim()}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Vezi detalii complete ANAF"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                </div>
                {anafResult && (
                  <p className={`text-sm mt-1 ${anafResult.found ? 'text-green-600' : 'text-amber-600'}`}>
                    {anafResult.found ? '✓ Date completate din ANAF' : '⚠ CUI negăsit în baza ANAF'}
                  </p>
                )}
              </div>

              {/* Nume */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nume furnizor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nume}
                  onChange={(e) => setFormData({ ...formData, nume: e.target.value })}
                  placeholder="ex: ENEL Energie"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.nume ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.nume && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.nume}</p>
                )}
              </div>

              {/* IBAN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IBAN (Cont bancar)
                </label>
                <input
                  type="text"
                  value={formData.contBancar}
                  onChange={(e) => setFormData({ ...formData, contBancar: e.target.value.toUpperCase() })}
                  placeholder="ex: RO49AAAA1B31007593840000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Adresa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresa
                </label>
                <input
                  type="text"
                  value={formData.adresa}
                  onChange={(e) => setFormData({ ...formData, adresa: e.target.value })}
                  placeholder="ex: Str. Exemplu nr. 10, București"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Telefon & Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={formData.telefon}
                    onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                    placeholder="ex: 0721 123 456"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ex: contact@furnizor.ro"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.email && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                  )}
                </div>
              </div>

              {/* Submit buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeModals}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {showEditModal ? 'Salvează' : 'Adaugă'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedFurnizor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Confirmă ștergerea</h3>
                  <p className="text-gray-500 text-sm">Această acțiune este ireversibilă</p>
                </div>
              </div>

              <p className="text-gray-700 mb-6">
                Ești sigur că vrei să ștergi furnizorul <strong>{selectedFurnizor.nume}</strong>?
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={closeModals}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Anulează
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
                >
                  {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Șterge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ANAF Verification Modal */}
      {showAnafModal && anafModalCui && (
        <AnafVerificationModal
          cui={anafModalCui}
          onClose={() => {
            setShowAnafModal(false)
            setAnafModalCui('')
          }}
          onAutoFill={(showAddModal || showEditModal) ? (firma) => {
            setFormData(prev => ({
              ...prev,
              nume: firma.denumire || prev.nume,
              adresa: firma.adresa || prev.adresa,
              telefon: firma.telefon || prev.telefon,
            }))
            setAnafResult({ found: true, firma })
          } : undefined}
        />
      )}
    </div>
  )
}
