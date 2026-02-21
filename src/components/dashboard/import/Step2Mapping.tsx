'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronRight, Check, AlertCircle } from 'lucide-react'
import { SYSTEM_FIELDS } from '@/lib/import/excel-parser'
import type { ImportPreview } from './ImportWizardModal'

interface Step2MappingProps {
  sessionId: string
  preview: ImportPreview
  mapping: Record<string, string>
  onMappingChange: (mapping: Record<string, string>) => void
  onComplete: () => void
}

export function Step2Mapping({
  sessionId,
  preview,
  mapping,
  onMappingChange,
  onComplete,
}: Step2MappingProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mappedSystemFields = Object.values(mapping)
  const isNumarMapped = mappedSystemFields.includes('numar')

  const handleFieldMap = (excelHeader: string, systemField: string) => {
    const newMapping = { ...mapping }
    if (systemField === '') {
      delete newMapping[excelHeader]
    } else {
      // Remove this system field from any other header first
      Object.keys(newMapping).forEach((key) => {
        if (newMapping[key] === systemField) delete newMapping[key]
      })
      newMapping[excelHeader] = systemField
    }
    onMappingChange(newMapping)
  }

  const handleSaveMapping = async () => {
    if (!isNumarMapped) {
      setError('Câmpul "Număr Unitate" trebuie mapat.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/import/${sessionId}/mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapping }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Eroare la salvarea mapării')
        return
      }

      onComplete()
    } catch {
      setError('Eroare de rețea')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Asociați coloanele din fișier cu câmpurile din sistem.
          Câmpurile detectate automat sunt marcate cu verde.
        </p>
        <span className="text-xs text-gray-500">
          {preview.totalRows} rânduri detectate
        </span>
      </div>

      {/* Mapping table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-2 px-3 font-medium text-gray-600">Coloană din fișier</th>
              <th className="text-left py-2 px-3 font-medium text-gray-600 w-8"></th>
              <th className="text-left py-2 px-3 font-medium text-gray-600">Câmp sistem</th>
              <th className="text-left py-2 px-3 font-medium text-gray-600">Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {preview.headers.filter(Boolean).map((header, idx) => {
              const currentField = mapping[header]
              const isAutoDetected = preview.autoMapping?.[header] === currentField && !!currentField
              const previewValue = preview.previewRows[0]?.[idx]

              return (
                <tr key={header} className={currentField ? 'bg-green-50/30' : ''}>
                  <td className="py-2 px-3 font-mono text-xs">
                    {header}
                  </td>
                  <td className="py-2 px-3 text-gray-300">
                    <ChevronRight className="h-4 w-4" />
                  </td>
                  <td className="py-2 px-3">
                    <select
                      className={`
                        w-full text-sm border rounded px-2 py-1
                        ${isAutoDetected ? 'border-green-300 bg-green-50' : 'border-gray-300'}
                      `}
                      value={currentField || ''}
                      onChange={(e) => handleFieldMap(header, e.target.value)}
                    >
                      <option value="">— Ignoră —</option>
                      {SYSTEM_FIELDS.map((sf) => (
                        <option
                          key={sf.key}
                          value={sf.key}
                          disabled={mappedSystemFields.includes(sf.key) && currentField !== sf.key}
                        >
                          {sf.label}{sf.required ? ' *' : ''}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3 text-xs text-gray-500 truncate max-w-[150px]">
                    {previewValue !== undefined && previewValue !== '' ? String(previewValue) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Preview of mapped data */}
      {preview.previewRows.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600">
            Preview primele {Math.min(5, preview.previewRows.length)} rânduri (cu maparea curentă)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-1 px-2 text-left text-gray-500">#</th>
                  {SYSTEM_FIELDS.filter((sf) => mappedSystemFields.includes(sf.key)).map((sf) => (
                    <th key={sf.key} className="py-1 px-2 text-left text-gray-600">
                      {sf.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview.previewRows.slice(0, 5).map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    <td className="py-1 px-2 text-gray-400">{rowIdx + 1}</td>
                    {SYSTEM_FIELDS.filter((sf) => mappedSystemFields.includes(sf.key)).map((sf) => {
                      const headerKey = Object.entries(mapping).find(([, v]) => v === sf.key)?.[0]
                      const colIdx = headerKey ? preview.headers.indexOf(headerKey) : -1
                      const val = colIdx >= 0 ? row[colIdx] : ''
                      return (
                        <td key={sf.key} className="py-1 px-2 truncate max-w-[120px]">
                          {val !== undefined && val !== '' ? String(val) : '—'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isNumarMapped && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Câmpul &quot;Număr Unitate&quot; este obligatoriu. Selectați coloana corespunzătoare.
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button onClick={handleSaveMapping} disabled={!isNumarMapped || saving} loading={saving}>
          Validează datele <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}
