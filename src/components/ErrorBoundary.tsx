'use client'

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // Call optional onError callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log to error reporting service (Sentry, etc.)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service
      // Example: Sentry.captureException(error)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Oops! Ceva nu a mers bine
            </h2>

            <p className="text-gray-600 mb-6">
              A apărut o eroare neașteptată. Te rugăm să reîncarci pagina sau să revii la început.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 mb-2">
                  Detalii tehnice (doar în development)
                </summary>
                <pre className="text-xs bg-gray-100 p-4 rounded-lg overflow-auto max-h-40 text-red-600">
                  {this.state.error.toString()}
                  {'\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleReset} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reîncearcă
              </Button>
              <Link href="/dashboard">
                <Button>
                  <Home className="h-4 w-4 mr-2" />
                  Înapoi la Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Lightweight error boundary for specific sections
export function SectionErrorBoundary({
  children,
  fallbackMessage = 'Secțiunea nu poate fi afișată'
}: {
  children: ReactNode
  fallbackMessage?: string
}) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-8 bg-red-50 border border-red-200 rounded-lg text-center">
          <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
          <p className="text-red-800">{fallbackMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-sm text-red-600 hover:text-red-700 underline"
          >
            Reîncearcă
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
