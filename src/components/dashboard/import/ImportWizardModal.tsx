'use client'

import { useState, useCallback } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Step1Upload } from './Step1Upload'
import { Step2Mapping } from './Step2Mapping'
import { Step3Validation } from './Step3Validation'
import { Step4Confirm } from './Step4Confirm'

interface ImportWizardModalProps {
  open: boolean
  onClose: () => void
  onComplete: () => void
  asociatieId: string
}

export interface ImportPreview {
  sheets: Array<{ name: string; rowCount: number }>
  selectedSheet: string
  headers: string[]
  previewRows: any[][]
  totalRows: number
  autoMapping: Record<string, string>
  ocrConfidence?: number
}

const STEPS = [
  { num: 1, label: 'Încarcă fișier' },
  { num: 2, label: 'Mapare coloane' },
  { num: 3, label: 'Validare' },
  { num: 4, label: 'Confirmare' },
]

export function ImportWizardModal({ open, onClose, onComplete, asociatieId }: ImportWizardModalProps) {
  const [step, setStep] = useState(1)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [validationResult, setValidationResult] = useState<any>(null)

  const handleUploadComplete = useCallback((sid: string, prev: ImportPreview) => {
    setSessionId(sid)
    setPreview(prev)
    setMapping(prev.autoMapping || {})
    setStep(2)
  }, [])

  const handleMappingComplete = useCallback(() => {
    setStep(3)
  }, [])

  const handleValidationComplete = useCallback((result: any) => {
    setValidationResult(result)
    if (result.status === 'READY') {
      setStep(4)
    }
  }, [])

  const handleImportComplete = useCallback(() => {
    onComplete()
    onClose()
  }, [onComplete, onClose])

  const handleClose = () => {
    // Cleanup session if in progress
    if (sessionId && step < 4) {
      fetch(`/api/import/${sessionId}`, { method: 'DELETE' }).catch(() => {})
    }
    setStep(1)
    setSessionId(null)
    setPreview(null)
    setMapping({})
    setValidationResult(null)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Import Unități"
      size="xl"
      className="max-h-[90vh] overflow-hidden flex flex-col"
    >
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6 px-1">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center flex-1">
            <div className="flex items-center gap-2 flex-1">
              <div
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0
                  ${step > s.num ? 'bg-green-100 text-green-700' : ''}
                  ${step === s.num ? 'bg-blue-600 text-white' : ''}
                  ${step < s.num ? 'bg-gray-100 text-gray-400' : ''}
                `}
              >
                {step > s.num ? '✓' : s.num}
              </div>
              <span className={`text-xs ${step >= s.num ? 'text-gray-900' : 'text-gray-400'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 mx-2 ${step > s.num ? 'bg-green-300' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="overflow-y-auto max-h-[60vh] min-h-[300px]">
        {step === 1 && (
          <Step1Upload
            asociatieId={asociatieId}
            onComplete={handleUploadComplete}
          />
        )}
        {step === 2 && preview && sessionId && (
          <Step2Mapping
            sessionId={sessionId}
            preview={preview}
            mapping={mapping}
            onMappingChange={setMapping}
            onComplete={handleMappingComplete}
          />
        )}
        {step === 3 && sessionId && (
          <Step3Validation
            sessionId={sessionId}
            onComplete={handleValidationComplete}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && sessionId && (
          <Step4Confirm
            sessionId={sessionId}
            validationResult={validationResult}
            onComplete={handleImportComplete}
            onBack={() => setStep(3)}
          />
        )}
      </div>

      {/* Navigation */}
      {step > 1 && step < 4 && (
        <div className="flex justify-between pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => setStep(step - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Înapoi
          </Button>
          <Button variant="ghost" onClick={handleClose}>
            Anulează
          </Button>
        </div>
      )}
    </Dialog>
  )
}
