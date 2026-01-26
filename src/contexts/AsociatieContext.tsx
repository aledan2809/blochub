'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Asociatie {
  id: string
  nume: string
  adresa: string
  oras: string
  _count?: {
    apartamente: number
  }
}

interface AsociatieContextType {
  asociatii: Asociatie[]
  currentAsociatie: Asociatie | null
  loading: boolean
  setCurrentAsociatie: (asociatie: Asociatie) => void
  refreshAsociatii: () => Promise<void>
  addAsociatie: (asociatie: Asociatie) => void
}

const AsociatieContext = createContext<AsociatieContextType | undefined>(undefined)

export function AsociatieProvider({ children }: { children: ReactNode }) {
  const [asociatii, setAsociatii] = useState<Asociatie[]>([])
  const [currentAsociatie, setCurrentAsociatieState] = useState<Asociatie | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAsociatii()
  }, [])

  async function fetchAsociatii() {
    try {
      const res = await fetch('/api/asociatii')
      const data = await res.json()

      if (data.asociatii && data.asociatii.length > 0) {
        setAsociatii(data.asociatii)

        // Check localStorage for last selected
        const savedId = localStorage.getItem('currentAsociatieId')
        const savedAsociatie = data.asociatii.find((a: Asociatie) => a.id === savedId)

        if (savedAsociatie) {
          setCurrentAsociatieState(savedAsociatie)
        } else {
          setCurrentAsociatieState(data.asociatii[0])
          localStorage.setItem('currentAsociatieId', data.asociatii[0].id)
        }
      }
    } catch (err) {
      console.error('Error fetching asociatii:', err)
    } finally {
      setLoading(false)
    }
  }

  function setCurrentAsociatie(asociatie: Asociatie) {
    setCurrentAsociatieState(asociatie)
    localStorage.setItem('currentAsociatieId', asociatie.id)
    // Trigger page refresh to load new data
    window.location.reload()
  }

  function addAsociatie(asociatie: Asociatie) {
    setAsociatii([asociatie, ...asociatii])
    setCurrentAsociatieState(asociatie)
    localStorage.setItem('currentAsociatieId', asociatie.id)
  }

  async function refreshAsociatii() {
    await fetchAsociatii()
  }

  return (
    <AsociatieContext.Provider
      value={{
        asociatii,
        currentAsociatie,
        loading,
        setCurrentAsociatie,
        refreshAsociatii,
        addAsociatie,
      }}
    >
      {children}
    </AsociatieContext.Provider>
  )
}

export function useAsociatie() {
  const context = useContext(AsociatieContext)
  if (context === undefined) {
    throw new Error('useAsociatie must be used within an AsociatieProvider')
  }
  return context
}
