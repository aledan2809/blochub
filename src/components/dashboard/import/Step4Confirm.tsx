'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertTriangle, Download, Loader2 } from 'lucide-react'

interface Step4ConfirmProps {
  sessionId: string
  validationResult: any
  onComplete: () => void
  onBack: () => void
}

export function Step4Confirm({ sessionId, validationResult, onComplete, onBack }: Step4ConfirmProps) {
  const [confirmed, setConfirmed] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    createdCount?: number
    skippedCount?: number
    errors?: Array<{ row: number; message: string }>
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const warnings = validationResult?.warnings || []
  const validRows = validationResult?.validRowsCount || 0

  const handleImport = async () => {
    setImporting(true)
    setError(null)

    try {
      const res = await fetch(`/api/import/${sessionId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Eroare la import')
        return
      }

      setResult(data)
    } catch {
      setError('Eroare de rețea')
    } finally {
      setImporting(false)
    }
  }

  // Show result screen
  if (result) {
    return (
      <div className="text-center py-6 space-y-4">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
        <h3 className="text-lg font-semibold text-gray-900">Import finalizat</h3>

        <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-700">{result.createdCount}</div>
            <div className="text-xs text-green-600">create</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-500">{result.skippedCount}</div>
            <div className="text-xs text-gray-500">ignorate</div>
          </div>
        </div>

        {result.errors && result.errors.length > 0 && (
          <div className="border border-red-200 rounded-lg p-3 text-left max-h-[150px] overflow-y-auto">
            <p className="text-sm font-medium text-red-700 mb-2">Erori la import:</p>
            {result.errors.map((err, idx) => (
              <p key={idx} className="text-xs text-red-600">
                Rând {err.row}: {err.message}
              </p>
            ))}
          </div>
        )}

        <Button onClick={onComplete}>Închide</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
        <p className="text-sm text-blue-800">
          Se vor crea <strong>{validRows} unități</strong> în baza de date.
        </p>
      </div>

      {/* Warnings reminder */}
      {warnings.length > 0 && (
        <div className="border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-800 mb-2">
            <AlertTriangle className="h-4 w-4" />
            {warnings.length} avertisment{warnings.length > 1 ? 'e' : ''}
          </div>
          <div className="max-h-[120px] overflow-y-auto space-y-1">
            {warnings.slice(0, 10).map((w: any, idx: number) => (
              <p key={idx} className="text-xs text-amber-700">{w.message}</p>
            ))}
            {warnings.length > 10 && (
              <p className="text-xs text-amber-600 font-medium">
                ...și încă {warnings.length - 10} avertismente
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 mt-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="rounded border-amber-300"
            />
            <span className="text-sm text-amber-800">
              Am luat la cunoștință avertismentele de mai sus
            </span>
          </label>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} disabled={importing}>
          Înapoi
        </Button>
        <Button
          onClick={handleImport}
          disabled={importing || (warnings.length > 0 && !confirmed)}
          loading={importing}
          className="bg-green-600 hover:bg-green-700"
        >
          {importing ? 'Se importă...' : `Importă ${validRows} unități`}
        </Button>
      </div>
    </div>
  )
}
