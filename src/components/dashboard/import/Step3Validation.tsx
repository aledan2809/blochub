'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronRight, AlertTriangle, XCircle, CheckCircle, Loader2 } from 'lucide-react'

interface ValidationError {
  type: 'ERROR' | 'WARNING'
  row: number
  field: string
  message: string
  value?: string
}

interface Step3ValidationProps {
  sessionId: string
  onComplete: (result: any) => void
  onBack: () => void
}

export function Step3Validation({ sessionId, onComplete, onBack }: Step3ValidationProps) {
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [warnings, setWarnings] = useState<ValidationError[]>([])
  const [validRowsCount, setValidRowsCount] = useState(0)
  const [status, setStatus] = useState<string>('')
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    runValidation()
  }, [sessionId])

  const runValidation = async () => {
    setLoading(true)
    setApiError(null)

    try {
      const res = await fetch(`/api/import/${sessionId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()
      if (!res.ok) {
        setApiError(data.error || 'Eroare la validare')
        return
      }

      setErrors(data.errors || [])
      setWarnings(data.warnings || [])
      setValidRowsCount(data.validRowsCount || 0)
      setStatus(data.status)
    } catch {
      setApiError('Eroare de rețea')
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = () => {
    onComplete({ errors, warnings, validRowsCount, status })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center py-12">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-3" />
        <p className="text-sm text-gray-600">Se validează datele...</p>
      </div>
    )
  }

  if (apiError) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 text-red-700 text-sm p-4 rounded-lg border border-red-200">
          {apiError}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack}>Înapoi</Button>
          <Button onClick={runValidation}>Reîncearcă</Button>
        </div>
      </div>
    )
  }

  const hasBlockingErrors = errors.length > 0

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
          <div className="text-lg font-semibold text-green-700">{validRowsCount}</div>
          <div className="text-xs text-green-600">Rânduri valide</div>
        </div>
        <div className={`border rounded-lg p-3 text-center ${errors.length > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
          <XCircle className={`h-5 w-5 mx-auto mb-1 ${errors.length > 0 ? 'text-red-600' : 'text-gray-400'}`} />
          <div className={`text-lg font-semibold ${errors.length > 0 ? 'text-red-700' : 'text-gray-500'}`}>{errors.length}</div>
          <div className={`text-xs ${errors.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>Erori</div>
        </div>
        <div className={`border rounded-lg p-3 text-center ${warnings.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
          <AlertTriangle className={`h-5 w-5 mx-auto mb-1 ${warnings.length > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
          <div className={`text-lg font-semibold ${warnings.length > 0 ? 'text-amber-700' : 'text-gray-500'}`}>{warnings.length}</div>
          <div className={`text-xs ${warnings.length > 0 ? 'text-amber-600' : 'text-gray-400'}`}>Avertismente</div>
        </div>
      </div>

      {/* Errors list */}
      {errors.length > 0 && (
        <div className="border border-red-200 rounded-lg overflow-hidden">
          <div className="bg-red-50 px-3 py-2 flex items-center gap-2 text-sm font-medium text-red-800">
            <XCircle className="h-4 w-4" />
            Erori (trebuie corectate înainte de import)
          </div>
          <div className="max-h-[200px] overflow-y-auto divide-y divide-red-100">
            {errors.map((err, idx) => (
              <div key={idx} className="px-3 py-2 text-sm">
                <span className="text-red-700">
                  {err.row > 0 ? `Rând ${err.row}: ` : ''}
                  {err.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings list */}
      {warnings.length > 0 && (
        <div className="border border-amber-200 rounded-lg overflow-hidden">
          <div className="bg-amber-50 px-3 py-2 flex items-center gap-2 text-sm font-medium text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            Avertismente (importul poate continua)
          </div>
          <div className="max-h-[200px] overflow-y-auto divide-y divide-amber-100">
            {warnings.map((warn, idx) => (
              <div key={idx} className="px-3 py-2 text-sm">
                <span className="text-amber-700">
                  {warn.row > 0 ? `Rând ${warn.row}: ` : ''}
                  {warn.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>Înapoi la mapare</Button>
        {hasBlockingErrors ? (
          <p className="text-sm text-red-600 self-center">
            Corectați erorile din fișier și reîncărcați.
          </p>
        ) : (
          <Button onClick={handleContinue}>
            Continuă <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}
