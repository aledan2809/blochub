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
    // Log initial localStorage state
    const initialSavedId = localStorage.getItem('currentAsociatieId')
    console.log('AsociatieContext - INIT - localStorage currentAsociatieId:', initialSavedId)
    fetchAsociatii()
  }, [])

  async function fetchAsociatii() {
    try {
      const res = await fetch('/api/asociatii', { cache: 'no-store' })
      const data = await res.json()

      console.log('AsociatieContext - fetched asociatii:', data.asociatii?.map((a: Asociatie) => ({ id: a.id, nume: a.nume })))

      if (data.asociatii && data.asociatii.length > 0) {
        setAsociatii(data.asociatii)

        // Check localStorage for last selected
        const savedId = localStorage.getItem('currentAsociatieId')
        console.log('AsociatieContext - savedId from localStorage:', savedId)

        const savedAsociatie = data.asociatii.find((a: Asociatie) => a.id === savedId)

        if (savedAsociatie) {
          console.log('AsociatieContext - setting currentAsociatie to saved:', savedAsociatie.id, savedAsociatie.nume)
          setCurrentAsociatieState(savedAsociatie)
        } else {
          console.log('AsociatieContext - savedId not found, using first:', data.asociatii[0].id, data.asociatii[0].nume)
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
    console.log('setCurrentAsociatie - switching to:', asociatie.id, asociatie.nume)
    setCurrentAsociatieState(asociatie)
    localStorage.setItem('currentAsociatieId', asociatie.id)
    console.log('setCurrentAsociatie - localStorage updated, reloading...')
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
