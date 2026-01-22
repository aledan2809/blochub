'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Lock,
  Trash2,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Comentariu {
  id: string
  continut: string
  esteIntern: boolean
  createdAt: string
  autor: {
    id: string
    name: string
  }
}

interface TichetDetail {
  id: string
  numar: number
  titlu: string
  descriere: string
  categorie: string
  prioritate: string
  status: string
  locatie?: string
  imagini: string[]
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
  comentarii: Comentariu[]
  asociatie: {
    adminId: string
    nume: string
  }
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  DESCHIS: { label: 'Deschis', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: <AlertCircle className="h-4 w-4" /> },
  IN_LUCRU: { label: 'În lucru', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: <Clock className="h-4 w-4" /> },
  REZOLVAT: { label: 'Rezolvat', color: 'text-green-700', bgColor: 'bg-green-100', icon: <CheckCircle2 className="h-4 w-4" /> },
  INCHIS: { label: 'Închis', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: <XCircle className="h-4 w-4" /> },
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

export default function TichetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tichet, setTichet] = useState<TichetDetail | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchTichet()
  }, [id])

  async function fetchTichet() {
    try {
      const res = await fetch(`/api/tichete/${id}`)
      if (!res.ok) {
        router.push('/dashboard/tichete')
        return
      }
      const data = await res.json()
      setTichet(data.tichet)
      setIsAdmin(data.isAdmin)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/tichete/${id}/comentarii`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          continut: newComment,
          esteIntern: isAdmin && isInternal,
        }),
      })

      if (res.ok) {
        setNewComment('')
        setIsInternal(false)
        fetchTichet()
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleStatusChange(newStatus: string) {
    setUpdating(true)
    try {
      const res = await fetch(`/api/tichete/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        fetchTichet()
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setUpdating(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Sigur dorești să ștergi această sesizare?')) return

    try {
      const res = await fetch(`/api/tichete/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/dashboard/tichete')
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!tichet) {
    return null
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <Link href="/dashboard/tichete" className="inline-flex items-center text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Înapoi la sesizări
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-gray-400">#{tichet.numar}</span>
              <span className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm',
                statusConfig[tichet.status].bgColor,
                statusConfig[tichet.status].color
              )}>
                {statusConfig[tichet.status].icon}
                {statusConfig[tichet.status].label}
              </span>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {categoriiLabels[tichet.categorie]}
              </span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">{tichet.titlu}</h1>
          </div>

          {/* Admin actions */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <select
                className="px-3 py-1.5 border rounded-lg text-sm"
                value={tichet.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={updating}
              >
                <option value="DESCHIS">Deschis</option>
                <option value="IN_LUCRU">În lucru</option>
                <option value="REZOLVAT">Rezolvat</option>
                <option value="INCHIS">Închis</option>
              </select>
              <Button variant="outline" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t">
          <p className="text-gray-700 whitespace-pre-wrap">{tichet.descriere}</p>
        </div>

        {tichet.locatie && (
          <div className="mt-4 text-sm text-gray-500">
            <strong>Locație:</strong> {tichet.locatie}
          </div>
        )}

        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>{tichet.creator.name || tichet.creator.email}</span>
          </div>
          <span>{new Date(tichet.createdAt).toLocaleString('ro-RO')}</span>
        </div>

        {tichet.rezolvatLa && (
          <div className="mt-2 text-sm text-green-600">
            Rezolvat la: {new Date(tichet.rezolvatLa).toLocaleString('ro-RO')}
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Comentarii ({tichet.comentarii.length})</h2>
        </div>

        {tichet.comentarii.length > 0 ? (
          <div className="divide-y">
            {tichet.comentarii.map((comment) => (
              <div
                key={comment.id}
                className={cn('p-4', comment.esteIntern && 'bg-yellow-50')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-sm">{comment.autor.name || 'Anonim'}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(comment.createdAt).toLocaleString('ro-RO')}
                  </span>
                  {comment.esteIntern && (
                    <span className="inline-flex items-center gap-1 text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded">
                      <Lock className="h-3 w-3" />
                      Intern
                    </span>
                  )}
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{comment.continut}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            Niciun comentariu încă
          </div>
        )}

        {/* Add comment form */}
        {tichet.status !== 'INCHIS' && (
          <form onSubmit={handleAddComment} className="p-4 border-t bg-gray-50">
            <textarea
              className="w-full px-3 py-2 border rounded-lg min-h-[80px] bg-white"
              placeholder="Scrie un comentariu..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <div className="flex items-center justify-between mt-3">
              {isAdmin && (
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="rounded"
                  />
                  <Lock className="h-4 w-4" />
                  Comentariu intern (vizibil doar admin)
                </label>
              )}
              <Button type="submit" disabled={submitting || !newComment.trim()} className="ml-auto">
                {submitting ? (
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
        )}
      </div>
    </div>
  )
}
