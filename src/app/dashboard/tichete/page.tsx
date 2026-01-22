'use client'

import { useState, useEffect } from 'react'
import {
  MessageSquarePlus,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  ChevronRight,
  Loader2,
  Wrench,
  Trash2,
  Car,
  Lightbulb,
  Volume2,
  Sparkles,
  HelpCircle,
  MoreHorizontal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Tichet {
  id: string
  numar: number
  titlu: string
  descriere: string
  categorie: string
  prioritate: string
  status: string
  locatie?: string
  createdAt: string
  rezolvatLa?: string
  creator: {
    id: string
    name: string
    email: string
  }
  asignat?: {
    id: string
    name: string
  }
  _count: {
    comentarii: number
  }
}

const categoriiIcons: Record<string, React.ReactNode> = {
  DEFECTIUNE: <Wrench className="h-4 w-4" />,
  CURATENIE: <Trash2 className="h-4 w-4" />,
  ZGOMOT: <Volume2 className="h-4 w-4" />,
  PARCARE: <Car className="h-4 w-4" />,
  ILUMINAT: <Lightbulb className="h-4 w-4" />,
  SUGGESTIE: <Sparkles className="h-4 w-4" />,
  FINANCIAR: <HelpCircle className="h-4 w-4" />,
  ALTELE: <MoreHorizontal className="h-4 w-4" />,
}

const categoriiLabels: Record<string, string> = {
  DEFECTIUNE: 'Defecțiune',
  CURATENIE: 'Curățenie',
  ZGOMOT: 'Zgomot',
  PARCARE: 'Parcare',
  ILUMINAT: 'Iluminat',
  SUGGESTIE: 'Sugestie',
  FINANCIAR: 'Financiar',
  ALTELE: 'Altele',
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  DESCHIS: { label: 'Deschis', color: 'bg-yellow-100 text-yellow-800', icon: <AlertCircle className="h-3 w-3" /> },
  IN_LUCRU: { label: 'În lucru', color: 'bg-blue-100 text-blue-800', icon: <Clock className="h-3 w-3" /> },
  REZOLVAT: { label: 'Rezolvat', color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-3 w-3" /> },
  INCHIS: { label: 'Închis', color: 'bg-gray-100 text-gray-800', icon: <XCircle className="h-3 w-3" /> },
}

const prioritateConfig: Record<string, { label: string; color: string }> = {
  SCAZUTA: { label: 'Scăzută', color: 'text-gray-500' },
  NORMALA: { label: 'Normală', color: 'text-blue-600' },
  URGENTA: { label: 'Urgentă', color: 'text-red-600 font-semibold' },
}

export default function TichetePage() {
  const [loading, setLoading] = useState(true)
  const [tichete, setTichete] = useState<Tichet[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterCategorie, setFilterCategorie] = useState('ALL')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    titlu: '',
    descriere: '',
    categorie: 'DEFECTIUNE',
    prioritate: 'NORMALA',
    locatie: '',
  })

  useEffect(() => {
    fetchTichete()
  }, [filterStatus, filterCategorie])

  async function fetchTichete() {
    try {
      const params = new URLSearchParams()
      if (filterStatus !== 'ALL') params.set('status', filterStatus)
      if (filterCategorie !== 'ALL') params.set('categorie', filterCategorie)

      const res = await fetch(`/api/tichete?${params}`)
      const data = await res.json()

      setTichete(data.tichete || [])
      setIsAdmin(data.isAdmin || false)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    try {
      const res = await fetch('/api/tichete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setShowForm(false)
        setFormData({
          titlu: '',
          descriere: '',
          categorie: 'DEFECTIUNE',
          prioritate: 'NORMALA',
          locatie: '',
        })
        fetchTichete()
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const stats = {
    total: tichete.length,
    deschise: tichete.filter(t => t.status === 'DESCHIS').length,
    inLucru: tichete.filter(t => t.status === 'IN_LUCRU').length,
    rezolvate: tichete.filter(t => t.status === 'REZOLVAT' || t.status === 'INCHIS').length,
  }

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sesizări</h1>
          <p className="text-gray-600">
            {isAdmin ? 'Gestionează sesizările locatarilor' : 'Raportează probleme și urmărește statusul'}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <MessageSquarePlus className="h-4 w-4 mr-2" />
          Sesizare nouă
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-sm text-gray-500">Total</p>
        </div>
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
          <p className="text-2xl font-bold text-yellow-700">{stats.deschise}</p>
          <p className="text-sm text-yellow-600">Deschise</p>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <p className="text-2xl font-bold text-blue-700">{stats.inLucru}</p>
          <p className="text-sm text-blue-600">În lucru</p>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <p className="text-2xl font-bold text-green-700">{stats.rezolvate}</p>
          <p className="text-sm text-green-600">Rezolvate</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="h-4 w-4 text-gray-500" />
        <select
          className="px-3 py-1.5 border rounded-lg text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="ALL">Toate statusurile</option>
          <option value="DESCHIS">Deschise</option>
          <option value="IN_LUCRU">În lucru</option>
          <option value="REZOLVAT">Rezolvate</option>
          <option value="INCHIS">Închise</option>
        </select>
        <select
          className="px-3 py-1.5 border rounded-lg text-sm"
          value={filterCategorie}
          onChange={(e) => setFilterCategorie(e.target.value)}
        >
          <option value="ALL">Toate categoriile</option>
          {Object.entries(categoriiLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Sesizare nouă</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Titlu *</label>
                  <Input
                    value={formData.titlu}
                    onChange={(e) => setFormData({ ...formData, titlu: e.target.value })}
                    placeholder="Ex: Lift defect la scara A"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Categorie</label>
                    <select
                      className="w-full px-3 py-2 border rounded-lg"
                      value={formData.categorie}
                      onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                    >
                      {Object.entries(categoriiLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Prioritate</label>
                    <select
                      className="w-full px-3 py-2 border rounded-lg"
                      value={formData.prioritate}
                      onChange={(e) => setFormData({ ...formData, prioritate: e.target.value })}
                    >
                      <option value="SCAZUTA">Scăzută</option>
                      <option value="NORMALA">Normală</option>
                      <option value="URGENTA">Urgentă</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Locație (opțional)</label>
                  <Input
                    value={formData.locatie}
                    onChange={(e) => setFormData({ ...formData, locatie: e.target.value })}
                    placeholder="Ex: Scara B, etaj 5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Descriere *</label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-lg min-h-[120px]"
                    value={formData.descriere}
                    onChange={(e) => setFormData({ ...formData, descriere: e.target.value })}
                    placeholder="Descrieți problema în detaliu..."
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowForm(false)}
                  >
                    Anulează
                  </Button>
                  <Button type="submit" className="flex-1" disabled={submitting}>
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Trimite sesizarea'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Tichete List */}
      {tichete.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <MessageSquarePlus className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nicio sesizare</h3>
          <p className="text-gray-500 mb-4">
            {filterStatus !== 'ALL' || filterCategorie !== 'ALL'
              ? 'Nu există sesizări cu filtrele selectate'
              : 'Nu există sesizări înregistrate'}
          </p>
          <Button onClick={() => setShowForm(true)}>
            <MessageSquarePlus className="h-4 w-4 mr-2" />
            Creează prima sesizare
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {tichete.map((tichet) => (
            <a
              key={tichet.id}
              href={`/dashboard/tichete/${tichet.id}`}
              className="block bg-white rounded-lg border hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={cn(
                      'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
                      tichet.prioritate === 'URGENTA' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                    )}>
                      {categoriiIcons[tichet.categorie]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-400">#{tichet.numar}</span>
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
                          statusConfig[tichet.status].color
                        )}>
                          {statusConfig[tichet.status].icon}
                          {statusConfig[tichet.status].label}
                        </span>
                        <span className={cn('text-xs', prioritateConfig[tichet.prioritate].color)}>
                          {prioritateConfig[tichet.prioritate].label}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900 truncate mt-1">{tichet.titlu}</h3>
                      <p className="text-sm text-gray-500 line-clamp-1">{tichet.descriere}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>{tichet.creator.name || tichet.creator.email}</span>
                        <span>•</span>
                        <span>{new Date(tichet.createdAt).toLocaleDateString('ro-RO')}</span>
                        {tichet._count.comentarii > 0 && (
                          <>
                            <span>•</span>
                            <span>{tichet._count.comentarii} comentarii</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
