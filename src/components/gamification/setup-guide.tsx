'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, Check, X, Sparkles } from 'lucide-react'
import { useGamification } from './gamification-provider'

export function SetupGuide() {
  const { data, loading } = useGamification()
  const [expanded, setExpanded] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || loading || !data) return null
  if (data.setupProgress === 100) return null // all done

  const completedCount = data.setupSteps.filter((s) => s.completed).length
  const totalCount = data.setupSteps.length

  return (
    <div className="bg-white border border-blue-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-3 flex-1 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Ghid de configurare</h3>
            <p className="text-xs text-gray-500">
              {completedCount} din {totalCount} pași completați
            </p>
          </div>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>

        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/60 transition-colors"
          title="Ascunde ghidul"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
          style={{ width: `${data.setupProgress}%` }}
        />
      </div>

      {/* Steps */}
      {expanded && (
        <div className="divide-y divide-gray-50">
          {data.setupSteps.map((step) => (
            <SetupStepItem key={step.id} step={step} />
          ))}
        </div>
      )}
    </div>
  )
}

interface StepProps {
  step: {
    id: string
    title: string
    description: string
    href: string
    xp: number
    icon: string
    completed: boolean
  }
}

function SetupStepItem({ step }: StepProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className={step.completed ? 'opacity-60' : ''}>
      <button
        onClick={() => !step.completed && setOpen(!open)}
        className="flex items-center gap-3 w-full px-5 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        {/* Status indicator */}
        {step.completed ? (
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <Check className="w-4 h-4 text-green-600" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-lg">
            {step.icon}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${step.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
            {step.title}
          </p>
        </div>

        {/* XP badge */}
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          step.completed
            ? 'bg-green-100 text-green-700'
            : 'bg-blue-100 text-blue-700'
        }`}>
          +{step.xp} XP
        </span>

        {!step.completed && (
          open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Expanded description */}
      {open && !step.completed && (
        <div className="px-5 pb-4 pl-16">
          <p className="text-sm text-gray-500 mb-3">{step.description}</p>
          <Link
            href={step.href}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Începe
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  )
}
