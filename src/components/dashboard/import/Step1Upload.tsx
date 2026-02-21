'use client'

import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, FileText, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ImportPreview } from './ImportWizardModal'

interface Step1UploadProps {
  asociatieId: string
  onComplete: (sessionId: string, preview: ImportPreview) => void
}

export function Step1Upload({ asociatieId, onComplete }: Step1UploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError(null)
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('asociatieId', asociatieId)

      const res = await fetch('/api/import/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Eroare la procesarea fișierului')
        return
      }

      onComplete(data.sessionId, data.preview)
    } catch (err) {
      setError('Eroare de rețea. Verificați conexiunea.')
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleDownloadTemplate = async (format: string) => {
    const link = document.createElement('a')
    link.href = `/api/templates/download?format=${format}`
    link.download = `template_${format}.xlsx`
    link.click()
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600">
        Încarcă un fișier Excel (.xlsx, .xls) sau PDF cu lista de unități.
        Sistemul va detecta automat coloanele și le va mapa cu câmpurile din sistem.
      </p>

      {/* Drag & drop zone */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${loading ? 'pointer-events-none opacity-50' : ''}
        `}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {loading ? (
          <>
            <Loader2 className="h-10 w-10 mx-auto text-blue-500 mb-3 animate-spin" />
            <p className="text-sm text-gray-600">Se procesează fișierul...</p>
          </>
        ) : (
          <>
            <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
            <p className="text-sm text-gray-700 mb-1">
              Trage fișierul aici sau <span className="text-blue-600 font-medium">alege fișierul</span>
            </p>
            <p className="text-xs text-gray-400">
              Formate acceptate: .xlsx, .xls, .pdf — Max 10MB
            </p>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Template downloads */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <p className="text-sm font-medium text-gray-700 mb-3">
          Nu aveți un fișier pregătit? Descărcați un șablon:
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownloadTemplate('standard')}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Șablon Standard
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownloadTemplate('blocmanager')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Format BlocManager
          </Button>
        </div>
      </div>
    </div>
  )
}
