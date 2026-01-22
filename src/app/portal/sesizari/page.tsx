'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  AlertTriangle,
  Wrench,
  Volume2,
  Car,
  Lightbulb,
  Sparkles,
  CircleDollarSign,
  MoreHorizontal,
  Clock,
  CheckCircle,
  Loader2,
  X,
  Send,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
  _count?: { comentarii: number }
}

const categorieConfig: Record<string, { icon: any; color: string; label: string }> = {
  DEFECTIUNE: { icon: Wrench, color: 'text-red-600 bg-red-100', label: 'Defecțiune' },
  CURATENIE: { icon: Sparkles, color: 'text-blue-600 bg-blue-100', label: 'Curățenie' },
  ZGOMOT: { icon: Volume2, color: 'text-purple-600 bg-purple-100', label: 'Zgomot' },
  PARCARE: { icon: Car, color: 'text-orange-600 bg-orange-100', label: 'Parcare' },
  ILUMINAT: { icon: Lightbulb, color: 'text-yellow-600 bg-yellow-100', label: 'Iluminat' },
  SUGGESTIE: { icon: Sparkles, color: 'text-green-600 bg-green-100', label: 'Sugestie' },
  FINANCIAR: { icon: CircleDollarSign, color: 'text-emerald-600 bg-emerald-100', label: 'Financiar' },
  ALTELE: { icon: MoreHorizontal, color: 'text-gray-600 bg-gray-100', label: 'Altele' },
}

const statusConfig: Record<string, { color: string; label: string }> = {
  DESCHIS: { color: 'bg-blue-100 text-blue-700', label: 'Deschis' },
  IN_LUCRU: { color: 'bg-yellow-100 text-yellow-700', label: 'În lucru' },
  REZOLVAT: { color: 'bg-green-100 text-green-700', label: 'Rezolvat' },
  INCHIS: { color: 'bg-gray-100 text-gray-700', label: 'Închis' },
}

export default function PortalSesizariPage() {
  const [tichete, setTichete] = useState<Tichet[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    titlu: '',
    descriere: '',
    categorie: 'DEFECTIUNE',
    prioritate: 'NORMALA',
    locatie: '',
  })

  useEffect(() => {
    fetchTichete()
  }, [])

  const fetchTichete = async () => {
    try {
      const res = await fetch('/api/tichete')
      if (res.ok) {
        const data = await res.json()
        setTichete(data.tichete || [])
      }
    } catch (error) {
      console.error('Error fetching tichete:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const res = await fetch('/api/tichete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setShowCreateModal(false)
        setFormData({
          titlu: '',
          descriere: '',
          categorie: 'DEFECTIUNE',
          prioritate: 'NORMALA',
          locatie: '',
        })
        fetchTichete()
      } else {
        const data = await res.json()
        alert(data.error || 'Eroare la trimiterea sesizării')
      }
    } catch (error) {
      alert('Eroare la trimiterea sesizării')
    } finally {
      setCreating(false)
    }
  }

  const activeCount = tichete.filter(t => t.status === 'DESCHIS' || t.status === 'IN_LUCRU').length
  const resolvedCount = tichete.filter(t => t.status === 'REZOLVAT' || t.status === 'INCHIS').length

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/portal">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Sesizările mele</h1>
            <p className="text-sm text-gray-500">Raportează și urmărește problemele</p>
          </div>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Sesizare nouă
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-sm text-gray-500">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resolvedCount}</p>
                <p className="text-sm text-gray-500">Rezolvate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : tichete.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Wrench className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Nicio sesizare încă</h3>
            <p className="text-gray-500 text-sm mb-4">
              Ai o problemă în bloc? Raportează-o administratorului.
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Trimite prima sesizare
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tichete.map((tichet) => {
            const cat = categorieConfig[tichet.categorie] || categorieConfig.ALTELE
            const status = statusConfig[tichet.status] || statusConfig.DESCHIS
            const Icon = cat.icon

            return (
              <Card key={tichet.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${cat.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium text-gray-900 truncate">
                            #{tichet.numar} - {tichet.titlu}
                          </h3>
                          <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                            {tichet.descriere}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>{cat.label}</span>
                        <span>•</span>
                        <span>{new Date(tichet.createdAt).toLocaleDateString('ro-RO')}</span>
                        {tichet._count?.comentarii ? (
                          <>
                            <span>•</span>
                            <span>{tichet._count.comentarii} comentarii</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Sesizare nouă</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowCreateModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titlu *
                </label>
                <Input
                  value={formData.titlu}
                  onChange={(e) => setFormData({ ...formData, titlu: e.target.value })}
                  placeholder="ex: Țeavă spartă în subsolul"
                  required
                  minLength={5}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categorie
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(categorieConfig).map(([key, config]) => {
                    const Icon = config.icon
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData({ ...formData, categorie: key })}
                        className={`p-2 rounded-lg border-2 transition-all ${
                          formData.categorie === key
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`h-5 w-5 mx-auto mb-1 ${config.color.split(' ')[0]}`} />
                        <span className="text-xs block">{config.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prioritate
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'SCAZUTA', label: 'Scăzută', color: 'bg-green-100 text-green-700' },
                    { value: 'NORMALA', label: 'Normală', color: 'bg-yellow-100 text-yellow-700' },
                    { value: 'URGENTA', label: 'Urgentă', color: 'bg-red-100 text-red-700' },
                  ].map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, prioritate: p.value })}
                      className={`py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        formData.prioritate === p.value
                          ? `border-blue-600 ${p.color}`
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Locație (opțional)
                </label>
                <Input
                  value={formData.locatie}
                  onChange={(e) => setFormData({ ...formData, locatie: e.target.value })}
                  placeholder="ex: Etaj 2, scara A"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descriere *
                </label>
                <textarea
                  value={formData.descriere}
                  onChange={(e) => setFormData({ ...formData, descriere: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                  placeholder="Descrie problema în detaliu..."
                  required
                  minLength={10}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCreateModal(false)}
                >
                  Anulează
                </Button>
                <Button type="submit" className="flex-1" disabled={creating}>
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Trimite
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
