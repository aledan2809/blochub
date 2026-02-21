'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, Trash2, Upload, Loader2, Download } from 'lucide-react'

interface DocumentUnitate {
  id: string
  tip: string
  titlu: string
  descriere: string | null
  fisierUrl: string
  fisierNume: string
  fisierSize: number | null
  createdAt: string
}

const TIP_LABELS: Record<string, string> = {
  CONTRACT_PROPRIETATE: 'Contract proprietate',
  BULETIN_ID: 'Buletin / CI',
  CONTRACT_INCHIRIERE: 'Contract închiriere',
  CERTIFICAT_FISCAL: 'Certificat fiscal',
  ALTELE: 'Altele',
}

interface DocumenteUnitatePanelProps {
  apartamentId: string
}

export function DocumenteUnitatePanel({ apartamentId }: DocumenteUnitatePanelProps) {
  const [documente, setDocumente] = useState<DocumentUnitate[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ tip: 'ALTELE', titlu: '', descriere: '', fisierUrl: '', fisierNume: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchDocuments()
  }, [apartamentId])

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/apartamente/${apartamentId}/documente`)
      const data = await res.json()
      setDocumente(data.documente || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!addForm.titlu || !addForm.fisierUrl) return
    setSaving(true)
    try {
      const res = await fetch(`/api/apartamente/${apartamentId}/documente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      if (res.ok) {
        fetchDocuments()
        setShowAdd(false)
        setAddForm({ tip: 'ALTELE', titlu: '', descriere: '', fisierUrl: '', fisierNume: '' })
      }
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (docId: string) => {
    if (!confirm('Sigur doriți să ștergeți acest document?')) return
    try {
      await fetch(`/api/apartamente/${apartamentId}/documente?docId=${docId}`, { method: 'DELETE' })
      setDocumente(documente.filter((d) => d.id !== docId))
    } catch {
      // ignore
    }
  }

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">
          Documente ({documente.length})
        </h4>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)}>
          <Upload className="h-3 w-3 mr-1" />
          Adaugă
        </Button>
      </div>

      {showAdd && (
        <div className="border rounded-lg p-3 space-y-2 bg-gray-50">
          <select
            className="w-full text-sm border rounded px-2 py-1.5"
            value={addForm.tip}
            onChange={(e) => setAddForm({ ...addForm, tip: e.target.value })}
          >
            {Object.entries(TIP_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <input
            className="w-full text-sm border rounded px-2 py-1.5"
            placeholder="Titlu document"
            value={addForm.titlu}
            onChange={(e) => setAddForm({ ...addForm, titlu: e.target.value })}
          />
          <input
            className="w-full text-sm border rounded px-2 py-1.5"
            placeholder="URL fișier"
            value={addForm.fisierUrl}
            onChange={(e) => setAddForm({ ...addForm, fisierUrl: e.target.value, fisierNume: e.target.value.split('/').pop() || '' })}
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Anulează</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!addForm.titlu || !addForm.fisierUrl}>
              Salvează
            </Button>
          </div>
        </div>
      )}

      {documente.length === 0 && !showAdd ? (
        <p className="text-xs text-gray-400 text-center py-4">
          Niciun document atașat
        </p>
      ) : (
        <div className="space-y-1">
          {documente.map((doc) => (
            <div key={doc.id} className="flex items-center gap-2 p-2 border rounded-lg text-sm hover:bg-gray-50">
              <FileText className="h-4 w-4 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{doc.titlu}</p>
                <p className="text-xs text-gray-400">
                  {TIP_LABELS[doc.tip] || doc.tip} — {formatSize(doc.fisierSize)} —{' '}
                  {new Date(doc.createdAt).toLocaleDateString('ro-RO')}
                </p>
              </div>
              <a
                href={doc.fisierUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 hover:bg-gray-200 rounded"
              >
                <Download className="h-3.5 w-3.5 text-gray-500" />
              </a>
              <button onClick={() => handleDelete(doc.id)} className="p-1 hover:bg-red-100 rounded">
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
