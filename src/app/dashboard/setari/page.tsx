'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Settings,
  Bell,
  Mail,
  Shield,
  Database,
  Download,
  Trash2,
  Save,
  Loader2,
  Check,
  AlertTriangle,
  User,
  Building2,
  CreditCard,
  FileText,
  Landmark,
  Plus,
  Pencil,
  X,
  Star,
  Receipt,
  RefreshCw,
  ExternalLink,
  Unplug,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface UserSettings {
  name: string
  email: string
  phone: string
  notificariEmail: boolean
  notificariSms: boolean
  reminderZile: number
}

interface AsociatieInfo {
  id: string
  nume: string
  apartamente: number
  chitante: number
  cheltuieli: number
}

interface AsociatieSettings {
  ziScadenta: number
  penalizareZi: number
  contBancar: string
  banca: string
  serieChitantier: string
  numarChitantierStart: number
}

interface ContBancar {
  id: string
  nume: string
  iban: string
  banca: string
  codBic: string | null
  esteImplicit: boolean
}

interface SMTPConfigState {
  configured: boolean
  host: string
  port: number
  secure: boolean
  user: string
  password: string
  fromEmail: string
  fromName: string
  enabled: boolean
  lastTest: string | null
  lastTestSuccess: boolean | null
  lastTestError: string | null
}

interface SPVStatus {
  configured: boolean
  connected: boolean
  cui: string | null
  expiresAt: string | null
  lastSync: string | null
  lastSyncError: string | null
  systemName: string
}

interface FacturaSPV {
  id: string
  spvId: string
  cuiFurnizor: string
  numeFurnizor: string
  numarFactura: string
  dataFactura: string
  dataScadenta: string | null
  sumaTotal: number
  sumaTVA: number | null
  moneda: string
  status: 'NOUA' | 'PROCESATA' | 'IGNORATA' | 'EROARE'
  importedAt: string
}

function SetariContent() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savingAsociatie, setSavingAsociatie] = useState(false)
  const [savedAsociatie, setSavedAsociatie] = useState(false)

  // Get initial tab from URL query parameter
  const validTabs = ['profil', 'notificari', 'asociatie', 'conturi', 'fiscal', 'date', 'cont'] as const
  const [activeTab, setActiveTab] = useState<typeof validTabs[number]>(
    tabParam && validTabs.includes(tabParam as typeof validTabs[number])
      ? tabParam as typeof validTabs[number]
      : 'profil'
  )

  // SPV / e-Factura state
  const [spvStatus, setSpvStatus] = useState<SPVStatus>({
    configured: false,
    connected: false,
    cui: null,
    expiresAt: null,
    lastSync: null,
    lastSyncError: null,
    systemName: 'SPV'
  })
  const [spvLoading, setSpvLoading] = useState(false)
  const [spvSyncing, setSpvSyncing] = useState(false)
  const [spvSyncResult, setSpvSyncResult] = useState<{ success: boolean; message: string; imported?: number } | null>(null)
  const [facturiSPV, setFacturiSPV] = useState<FacturaSPV[]>([])
  const [facturiLoading, setFacturiLoading] = useState(false)

  // Bank accounts state
  const [conturiBancare, setConturiBancare] = useState<ContBancar[]>([])
  const [showContModal, setShowContModal] = useState(false)
  const [editingCont, setEditingCont] = useState<ContBancar | null>(null)
  const [savingCont, setSavingCont] = useState(false)
  const [contForm, setContForm] = useState({
    nume: '',
    iban: '',
    banca: '',
    codBic: '',
    esteImplicit: false
  })

  const [settings, setSettings] = useState<UserSettings>({
    name: '',
    email: '',
    phone: '',
    notificariEmail: true,
    notificariSms: false,
    reminderZile: 5
  })

  // SMTP configuration state
  const [smtpConfig, setSMTPConfig] = useState<SMTPConfigState>({
    configured: false,
    host: '',
    port: 587,
    secure: false,
    user: '',
    password: '',
    fromEmail: '',
    fromName: '',
    enabled: false,
    lastTest: null,
    lastTestSuccess: null,
    lastTestError: null
  })
  const [useSMTP, setUseSMTP] = useState(false)
  const [savingSMTP, setSavingSMTP] = useState(false)
  const [testingSMTP, setTestingSMTP] = useState(false)
  const [smtpTestEmail, setSMTPTestEmail] = useState('')
  const [smtpTestResult, setSMTPTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const [asociatie, setAsociatie] = useState<AsociatieInfo | null>(null)
  const [asociatieSettings, setAsociatieSettings] = useState<AsociatieSettings>({
    ziScadenta: 25,
    penalizareZi: 0.02,
    contBancar: '',
    banca: '',
    serieChitantier: '',
    numarChitantierStart: 1
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Get user profile
      const profileRes = await fetch('/api/auth/profile')
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        setSettings(prev => ({
          ...prev,
          name: profileData.name || '',
          email: profileData.email || '',
          phone: profileData.phone || ''
        }))
      }

      // Get association stats
      const statsRes = await fetch('/api/dashboard/stats')
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        if (statsData.hasAsociatie) {
          setAsociatie({
            id: statsData.asociatie.id,
            nume: statsData.asociatie.nume,
            apartamente: statsData.stats.totalApartamente,
            chitante: 0, // Will be filled
            cheltuieli: 0
          })
        }
      }

      // Get association settings
      const asociatieRes = await fetch('/api/asociatie/settings')
      if (asociatieRes.ok) {
        const asociatieData = await asociatieRes.json()
        setAsociatieSettings({
          ziScadenta: asociatieData.ziScadenta || 25,
          penalizareZi: asociatieData.penalizareZi || 0.02,
          contBancar: asociatieData.contBancar || '',
          banca: asociatieData.banca || '',
          serieChitantier: asociatieData.serieChitantier || '',
          numarChitantierStart: asociatieData.numarChitantierStart || 1
        })
      }

      // Get bank accounts
      const statsResCheck = await fetch('/api/dashboard/stats')
      if (statsResCheck.ok) {
        const statsData = await statsResCheck.json()
        if (statsData.hasAsociatie) {
          const conturiRes = await fetch(`/api/conturi-bancare?asociatieId=${statsData.asociatie.id}`)
          if (conturiRes.ok) {
            const conturiData = await conturiRes.json()
            setConturiBancare(conturiData.conturi || [])
          }
        }
      }

      // Get SMTP configuration
      const smtpRes = await fetch('/api/asociatie/smtp')
      if (smtpRes.ok) {
        const smtpData = await smtpRes.json()
        if (smtpData.configured && smtpData.config) {
          setSMTPConfig({
            configured: true,
            host: smtpData.config.host || '',
            port: smtpData.config.port || 587,
            secure: smtpData.config.secure || false,
            user: smtpData.config.user || '',
            password: '', // Don't load password for security
            fromEmail: smtpData.config.fromEmail || '',
            fromName: smtpData.config.fromName || '',
            enabled: smtpData.config.enabled || false,
            lastTest: smtpData.config.lastTest || null,
            lastTestSuccess: smtpData.config.lastTestSuccess,
            lastTestError: smtpData.config.lastTestError || null
          })
          setUseSMTP(smtpData.config.enabled || false)
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchConturiBancare = async () => {
    if (!asociatie?.id) return
    try {
      const res = await fetch(`/api/conturi-bancare?asociatieId=${asociatie.id}`)
      if (res.ok) {
        const data = await res.json()
        setConturiBancare(data.conturi || [])
      }
    } catch (error) {
      console.error('Failed to fetch bank accounts:', error)
    }
  }

  const handleOpenContModal = (cont?: ContBancar) => {
    if (cont) {
      setEditingCont(cont)
      setContForm({
        nume: cont.nume,
        iban: cont.iban,
        banca: cont.banca,
        codBic: cont.codBic || '',
        esteImplicit: cont.esteImplicit
      })
    } else {
      setEditingCont(null)
      setContForm({
        nume: '',
        iban: '',
        banca: '',
        codBic: '',
        esteImplicit: conturiBancare.length === 0 // First account is default
      })
    }
    setShowContModal(true)
  }

  const handleSaveCont = async () => {
    if (!asociatie?.id || !contForm.nume || !contForm.iban || !contForm.banca) {
      alert('Completează toate câmpurile obligatorii')
      return
    }

    setSavingCont(true)
    try {
      const url = '/api/conturi-bancare'
      const method = editingCont ? 'PUT' : 'POST'
      const body = editingCont
        ? { id: editingCont.id, ...contForm }
        : { asociatieId: asociatie.id, ...contForm }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        setShowContModal(false)
        fetchConturiBancare()
      } else {
        const error = await res.json()
        alert(error.error || 'Eroare la salvare')
      }
    } catch (error) {
      console.error('Failed to save bank account:', error)
      alert('Eroare la salvare')
    } finally {
      setSavingCont(false)
    }
  }

  const handleDeleteCont = async (id: string) => {
    if (!confirm('Sigur doriți să ștergeți acest cont bancar?')) return

    try {
      const res = await fetch(`/api/conturi-bancare?id=${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        fetchConturiBancare()
      } else {
        const error = await res.json()
        alert(error.error || 'Eroare la ștergere')
      }
    } catch (error) {
      console.error('Failed to delete bank account:', error)
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch('/api/conturi-bancare', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, esteImplicit: true })
      })

      if (res.ok) {
        fetchConturiBancare()
      }
    } catch (error) {
      console.error('Failed to set default:', error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: settings.name,
          phone: settings.phone
        })
      })

      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAsociatie = async () => {
    setSavingAsociatie(true)
    try {
      const res = await fetch('/api/asociatie/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asociatieSettings)
      })

      if (res.ok) {
        setSavedAsociatie(true)
        setTimeout(() => setSavedAsociatie(false), 3000)
      } else {
        const data = await res.json()
        alert('Eroare: ' + (data.error || 'Nu s-au putut salva setările'))
      }
    } catch (error) {
      console.error('Failed to save asociatie settings:', error)
      alert('Eroare la salvarea setărilor')
    } finally {
      setSavingAsociatie(false)
    }
  }

  const handleExportData = async (format: 'json' | 'csv' = 'json') => {
    try {
      const res = await fetch(`/api/export?format=${format}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `blochub-export-${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        alert('Eroare la export')
      }
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export temporar indisponibil')
    }
  }

  // SMTP Configuration handlers
  const handleSaveSMTP = async () => {
    setSavingSMTP(true)
    setSMTPTestResult(null)
    try {
      const res = await fetch('/api/asociatie/smtp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpConfig.host,
          port: smtpConfig.port,
          secure: smtpConfig.secure,
          user: smtpConfig.user,
          password: smtpConfig.password,
          fromEmail: smtpConfig.fromEmail,
          fromName: smtpConfig.fromName,
          enabled: useSMTP
        })
      })

      if (res.ok) {
        setSMTPConfig(prev => ({ ...prev, configured: true, enabled: useSMTP }))
        setSMTPTestResult({ success: true, message: 'Configurația SMTP a fost salvată!' })
        setTimeout(() => setSMTPTestResult(null), 3000)
      } else {
        const data = await res.json()
        setSMTPTestResult({ success: false, message: data.error || 'Eroare la salvare' })
      }
    } catch (error) {
      console.error('Failed to save SMTP config:', error)
      setSMTPTestResult({ success: false, message: 'Eroare la salvarea configurației SMTP' })
    } finally {
      setSavingSMTP(false)
    }
  }

  const handleTestSMTP = async () => {
    if (!smtpTestEmail) {
      setSMTPTestResult({ success: false, message: 'Introdu o adresă email pentru test' })
      return
    }

    setTestingSMTP(true)
    setSMTPTestResult(null)
    try {
      const res = await fetch('/api/asociatie/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail: smtpTestEmail })
      })

      const data = await res.json()
      if (data.success) {
        setSMTPTestResult({ success: true, message: data.message || 'Email de test trimis cu succes!' })
        setSMTPConfig(prev => ({
          ...prev,
          lastTest: new Date().toISOString(),
          lastTestSuccess: true,
          lastTestError: null
        }))
      } else {
        setSMTPTestResult({ success: false, message: data.error || 'Test eșuat' })
        setSMTPConfig(prev => ({
          ...prev,
          lastTest: new Date().toISOString(),
          lastTestSuccess: false,
          lastTestError: data.error
        }))
      }
    } catch (error) {
      console.error('SMTP test failed:', error)
      setSMTPTestResult({ success: false, message: 'Eroare la testarea SMTP' })
    } finally {
      setTestingSMTP(false)
    }
  }

  const handleDeleteSMTP = async () => {
    if (!confirm('Sigur vrei să ștergi configurația SMTP? Notificările vor fi trimise prin serviciul BlocHub.')) {
      return
    }

    try {
      const res = await fetch('/api/asociatie/smtp', { method: 'DELETE' })
      if (res.ok) {
        setSMTPConfig({
          configured: false,
          host: '',
          port: 587,
          secure: false,
          user: '',
          password: '',
          fromEmail: '',
          fromName: '',
          enabled: false,
          lastTest: null,
          lastTestSuccess: null,
          lastTestError: null
        })
        setUseSMTP(false)
        setSMTPTestResult({ success: true, message: 'Configurația SMTP a fost ștearsă' })
        setTimeout(() => setSMTPTestResult(null), 3000)
      }
    } catch (error) {
      console.error('Failed to delete SMTP config:', error)
    }
  }

  // SPV / e-Factura handlers
  const fetchSPVStatus = async () => {
    try {
      const res = await fetch('/api/spv/auth', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setSpvStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch SPV status:', error)
    }
  }

  const fetchFacturiSPV = async () => {
    setFacturiLoading(true)
    try {
      const res = await fetch('/api/spv/facturi?limit=10')
      if (res.ok) {
        const data = await res.json()
        setFacturiSPV(data.facturi || [])
      }
    } catch (error) {
      console.error('Failed to fetch SPV invoices:', error)
    } finally {
      setFacturiLoading(false)
    }
  }

  const handleConnectSPV = async () => {
    setSpvLoading(true)
    try {
      const res = await fetch('/api/spv/auth')
      const data = await res.json()

      if (res.ok && data.authUrl) {
        // Redirect to ANAF authorization
        window.location.href = data.authUrl
      } else {
        setSpvSyncResult({ success: false, message: data.error || 'Eroare la conectare' })
      }
    } catch (error) {
      setSpvSyncResult({ success: false, message: 'Eroare la conectarea cu SPV' })
    } finally {
      setSpvLoading(false)
    }
  }

  const handleDisconnectSPV = async () => {
    if (!confirm('Sigur doriți să deconectați integrarea SPV/e-Factura?')) return

    setSpvLoading(true)
    try {
      const res = await fetch('/api/spv/auth', { method: 'DELETE' })
      if (res.ok) {
        setSpvStatus(prev => ({ ...prev, connected: false, cui: null, expiresAt: null }))
        setFacturiSPV([])
        setSpvSyncResult({ success: true, message: 'Deconectat de la SPV' })
        setTimeout(() => setSpvSyncResult(null), 3000)
      }
    } catch (error) {
      setSpvSyncResult({ success: false, message: 'Eroare la deconectare' })
    } finally {
      setSpvLoading(false)
    }
  }

  const handleSyncSPV = async () => {
    setSpvSyncing(true)
    setSpvSyncResult(null)
    try {
      const res = await fetch('/api/spv/sync', { method: 'POST' })
      const data = await res.json()

      if (res.ok) {
        setSpvSyncResult({
          success: data.success,
          message: data.success
            ? `Sincronizare completă: ${data.imported} facturi noi importate`
            : `Sincronizare parțială: ${data.errors?.join(', ')}`,
          imported: data.imported
        })
        fetchFacturiSPV()
        fetchSPVStatus()
      } else {
        setSpvSyncResult({ success: false, message: data.error || 'Eroare la sincronizare' })
      }
    } catch (error) {
      setSpvSyncResult({ success: false, message: 'Eroare la sincronizarea facturilor' })
    } finally {
      setSpvSyncing(false)
    }
  }

  // Check for SPV callback result
  useEffect(() => {
    const spvSuccess = searchParams.get('spv_success')
    const spvError = searchParams.get('spv_error')

    if (spvSuccess === 'true') {
      setSpvSyncResult({ success: true, message: 'Conectare SPV reușită!' })
      setActiveTab('fiscal')
      fetchSPVStatus()
      fetchFacturiSPV()
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard/setari?tab=fiscal')
    } else if (spvError) {
      setSpvSyncResult({ success: false, message: decodeURIComponent(spvError) })
      setActiveTab('fiscal')
      window.history.replaceState({}, '', '/dashboard/setari?tab=fiscal')
    }
  }, [searchParams])

  // Load SPV data when fiscal tab is active
  useEffect(() => {
    if (activeTab === 'fiscal') {
      fetchSPVStatus()
      if (spvStatus.connected) {
        fetchFacturiSPV()
      }
    }
  }, [activeTab])

  const tabs = [
    { id: 'profil', label: 'Profil', icon: User },
    { id: 'asociatie', label: 'Asociație', icon: Building2 },
    { id: 'conturi', label: 'Conturi Bancare', icon: Landmark },
    { id: 'fiscal', label: 'Fiscal', icon: Receipt },
    { id: 'notificari', label: 'Notificări', icon: Bell },
    { id: 'date', label: 'Date', icon: Database },
    { id: 'cont', label: 'Cont', icon: Shield },
  ]

  // Romanian banks list for dropdown
  const romanianBanks = [
    'Banca Transilvania',
    'BCR',
    'BRD - Groupe Societe Generale',
    'ING Bank',
    'Raiffeisen Bank',
    'CEC Bank',
    'UniCredit Bank',
    'Alpha Bank',
    'OTP Bank',
    'Garanti BBVA',
    'Intesa Sanpaolo',
    'First Bank',
    'Libra Internet Bank',
    'Altă bancă'
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="h-7 w-7 text-gray-600" />
          Setări
        </h1>
        <p className="text-gray-600 mt-1">
          Configurează profilul și preferințele aplicației
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border p-6">
        {/* Profil Tab */}
        {activeTab === 'profil' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Informații profil</h2>
              <div className="grid gap-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nume complet
                  </label>
                  <Input
                    value={settings.name}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                    placeholder="Ion Popescu"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={settings.email}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Email-ul nu poate fi modificat
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <Input
                    type="tel"
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    placeholder="0722 123 456"
                  />
                </div>
              </div>
            </div>

            {asociatie && (
              <div className="pt-6 border-t">
                <h2 className="text-lg font-semibold mb-4">Asociație administrată</h2>
                <div className="bg-gray-50 rounded-lg p-4 max-w-md">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{asociatie.nume}</p>
                      <p className="text-sm text-gray-500">{asociatie.apartamente} apartamente</p>
                    </div>
                  </div>
                  <Link href="/dashboard/cladire">
                    <Button variant="outline" size="sm">
                      Configurează clădirea
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            <div className="pt-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : saved ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saved ? 'Salvat!' : 'Salvează modificările'}
              </Button>
            </div>
          </div>
        )}

        {/* Asociație Tab */}
        {activeTab === 'asociatie' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Setări Penalizări</h2>
              <p className="text-gray-600 mb-6">
                Configurează penalizările pentru plăți întârziate. Acestea se calculează automat în Avizier.
              </p>

              <div className="grid gap-6 max-w-2xl">
                {/* Zi Scadenta */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ziua scadentă de plată
                  </label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={asociatieSettings.ziScadenta}
                      onChange={(e) => setAsociatieSettings({
                        ...asociatieSettings,
                        ziScadenta: parseInt(e.target.value) || 25
                      })}
                      className="w-24"
                    />
                    <span className="text-sm text-gray-600">a fiecărei luni</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Data până la care proprietarii trebuie să achite întreținerea lunară.
                    Penalizările se calculează de la această dată.
                  </p>
                </div>

                {/* Penalizare pe zi */}
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <label className="block text-sm font-medium text-orange-900 mb-2">
                    Penalizare zilnică pentru întârziere
                  </label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      step={0.01}
                      value={asociatieSettings.penalizareZi}
                      onChange={(e) => setAsociatieSettings({
                        ...asociatieSettings,
                        penalizareZi: parseFloat(e.target.value) || 0.02
                      })}
                      className="w-32"
                    />
                    <span className="text-sm text-gray-700">% pe zi</span>
                  </div>
                  <p className="text-xs text-orange-700 mt-2">
                    Exemplu: Pentru 0.02% pe zi și o restanță de 500 lei la 30 zile întârziere:<br />
                    Penalizare = 500 × 0.02% × 30 = <strong>3 lei</strong>
                  </p>
                  <div className="mt-3 p-3 bg-white rounded border border-orange-300">
                    <p className="text-xs font-medium text-orange-900 mb-1">Simulare pentru restanța de 1000 lei:</p>
                    <div className="text-xs text-orange-800 space-y-1">
                      <div className="flex justify-between">
                        <span>La 10 zile întârziere:</span>
                        <strong>{(1000 * (asociatieSettings.penalizareZi / 100) * 10).toFixed(2)} lei</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>La 30 zile întârziere:</span>
                        <strong>{(1000 * (asociatieSettings.penalizareZi / 100) * 30).toFixed(2)} lei</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>La 90 zile întârziere:</span>
                        <strong>{(1000 * (asociatieSettings.penalizareZi / 100) * 90).toFixed(2)} lei</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Date bancare */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="text-sm font-medium text-blue-900 mb-3">Date bancare asociație</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-blue-800 mb-1">
                        Cont bancar (IBAN)
                      </label>
                      <Input
                        value={asociatieSettings.contBancar}
                        onChange={(e) => setAsociatieSettings({
                          ...asociatieSettings,
                          contBancar: e.target.value
                        })}
                        placeholder="RO49AAAA1B31007593840000"
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-blue-800 mb-1">
                        Bancă
                      </label>
                      <Input
                        value={asociatieSettings.banca}
                        onChange={(e) => setAsociatieSettings({
                          ...asociatieSettings,
                          banca: e.target.value
                        })}
                        placeholder="BCR, BRD, ING, etc."
                        className="bg-white"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-blue-700 mt-2">
                    Aceste date vor apărea pe chitanțe și în avizier pentru plăți.
                  </p>
                </div>

                {/* Chitanțier Settings - Receipt Book Configuration */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="text-sm font-medium text-green-900 mb-3">Configurare Chitanțier</h3>
                  <p className="text-xs text-green-700 mb-4">
                    Setează seria și numărul de start pentru chitanțele de încasare emise la plățile în numerar.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-green-800 mb-1">
                        Serie chitanțier *
                      </label>
                      <Input
                        value={asociatieSettings.serieChitantier}
                        onChange={(e) => setAsociatieSettings({
                          ...asociatieSettings,
                          serieChitantier: e.target.value.toUpperCase()
                        })}
                        placeholder="ex: CHT, ABC"
                        className="bg-white uppercase"
                        maxLength={10}
                      />
                      <p className="text-xs text-green-600 mt-1">
                        Prefix unic pentru chitanțe (ex: CHT)
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-green-800 mb-1">
                        Număr start *
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={asociatieSettings.numarChitantierStart}
                        onChange={(e) => setAsociatieSettings({
                          ...asociatieSettings,
                          numarChitantierStart: parseInt(e.target.value) || 1
                        })}
                        placeholder="1"
                        className="bg-white"
                      />
                      <p className="text-xs text-green-600 mt-1">
                        Prima chitanță va avea acest număr
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-white rounded border border-green-300">
                    <p className="text-xs text-green-800">
                      <strong>Exemplu:</strong> Cu seria &quot;CHT&quot; și număr start 1,
                      prima chitanță va fi <strong>CHT-0001</strong>, următoarea <strong>CHT-0002</strong>, etc.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button onClick={handleSaveAsociatie} disabled={savingAsociatie}>
                {savingAsociatie ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : savedAsociatie ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {savedAsociatie ? 'Salvat!' : 'Salvează setările'}
              </Button>
            </div>
          </div>
        )}

        {/* Conturi Bancare Tab */}
        {activeTab === 'conturi' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Conturi Bancare</h2>
                <p className="text-gray-600 text-sm">
                  Gestionează conturile bancare pentru plăți furnizori
                </p>
              </div>
              <Button onClick={() => handleOpenContModal()} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Adaugă cont
              </Button>
            </div>

            {conturiBancare.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
                <Landmark className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nu ai conturi bancare configurate
                </h3>
                <p className="text-gray-500 mb-4">
                  Adaugă cel puțin un cont bancar pentru a putea genera fișiere de plată
                </p>
                <Button onClick={() => handleOpenContModal()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adaugă primul cont
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {conturiBancare.map(cont => (
                  <div
                    key={cont.id}
                    className={cn(
                      'p-4 rounded-lg border',
                      cont.esteImplicit ? 'bg-blue-50 border-blue-200' : 'bg-white'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'h-10 w-10 rounded-lg flex items-center justify-center',
                          cont.esteImplicit ? 'bg-blue-100' : 'bg-gray-100'
                        )}>
                          <Landmark className={cn(
                            'h-5 w-5',
                            cont.esteImplicit ? 'text-blue-600' : 'text-gray-500'
                          )} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{cont.nume}</p>
                            {cont.esteImplicit && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                                Implicit
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 font-mono">{cont.iban}</p>
                          <p className="text-sm text-gray-500">{cont.banca}</p>
                          {cont.codBic && (
                            <p className="text-xs text-gray-400">BIC: {cont.codBic}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!cont.esteImplicit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefault(cont.id)}
                            title="Setează ca implicit"
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenContModal(cont)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteCont(cont.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900">Sfat</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Contul marcat ca &quot;Implicit&quot; va fi selectat automat când adaugi plăți noi.
                      Poți avea mai multe conturi pentru diferite tipuri de plăți.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bank Account Modal */}
        {showContModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowContModal(false)} />
            <div className="relative bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  {editingCont ? 'Editează cont bancar' : 'Adaugă cont bancar'}
                </h2>
                <button
                  onClick={() => setShowContModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Denumire cont *
                  </label>
                  <Input
                    value={contForm.nume}
                    onChange={(e) => setContForm({ ...contForm, nume: e.target.value })}
                    placeholder="ex: Cont BT Principal"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IBAN *
                  </label>
                  <Input
                    value={contForm.iban}
                    onChange={(e) => setContForm({ ...contForm, iban: e.target.value.toUpperCase() })}
                    placeholder="RO49AAAA1B31007593840000"
                    className="font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bancă *
                  </label>
                  <select
                    value={contForm.banca}
                    onChange={(e) => setContForm({ ...contForm, banca: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selectează banca</option>
                    {romanianBanks.map(bank => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cod BIC/SWIFT (opțional)
                  </label>
                  <Input
                    value={contForm.codBic}
                    onChange={(e) => setContForm({ ...contForm, codBic: e.target.value.toUpperCase() })}
                    placeholder="BTRLRO22"
                    className="font-mono"
                  />
                </div>

                <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contForm.esteImplicit}
                    onChange={(e) => setContForm({ ...contForm, esteImplicit: e.target.checked })}
                    className="h-4 w-4 rounded text-blue-600"
                  />
                  <span className="text-sm">Setează ca cont implicit pentru plăți</span>
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowContModal(false)}
                >
                  Anulează
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleSaveCont}
                  disabled={savingCont || !contForm.nume || !contForm.iban || !contForm.banca}
                >
                  {savingCont ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {editingCont ? 'Salvează' : 'Adaugă'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Fiscal Tab - SPV / e-Factura */}
        {activeTab === 'fiscal' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Integrare SPV / e-Factura</h2>
              <p className="text-gray-600 text-sm mb-6">
                Conectează-te la sistemul ANAF pentru a descărca automat facturile primite de la furnizori.
              </p>

              {/* SPV Status Card */}
              <div className={cn(
                'p-5 rounded-xl border-2',
                spvStatus.connected
                  ? 'bg-green-50 border-green-200'
                  : spvStatus.configured
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-gray-50 border-gray-200'
              )}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'h-12 w-12 rounded-xl flex items-center justify-center',
                      spvStatus.connected
                        ? 'bg-green-100'
                        : 'bg-gray-100'
                    )}>
                      <Receipt className={cn(
                        'h-6 w-6',
                        spvStatus.connected ? 'text-green-600' : 'text-gray-500'
                      )} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {spvStatus.systemName || 'SPV / e-Factura'}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {spvStatus.connected ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-green-700 text-sm font-medium">Conectat</span>
                            {spvStatus.cui && (
                              <span className="text-gray-500 text-sm">• CUI: {spvStatus.cui}</span>
                            )}
                          </>
                        ) : spvStatus.configured ? (
                          <>
                            <Clock className="h-4 w-4 text-amber-600" />
                            <span className="text-amber-700 text-sm">Server configurat, necesită autorizare</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-500 text-sm">Neconectat</span>
                          </>
                        )}
                      </div>
                      {spvStatus.lastSync && (
                        <p className="text-xs text-gray-500 mt-2">
                          Ultima sincronizare: {new Date(spvStatus.lastSync).toLocaleString('ro-RO')}
                        </p>
                      )}
                      {spvStatus.lastSyncError && (
                        <p className="text-xs text-red-600 mt-1">
                          Eroare: {spvStatus.lastSyncError}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {spvStatus.connected ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSyncSPV}
                          disabled={spvSyncing}
                        >
                          {spvSyncing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          <span className="ml-2 hidden sm:inline">Sincronizează</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDisconnectSPV}
                          disabled={spvLoading}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Unplug className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={handleConnectSPV}
                        disabled={spvLoading}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {spvLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <ExternalLink className="h-4 w-4 mr-2" />
                        )}
                        Conectează la ANAF
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Sync Result Message */}
              {spvSyncResult && (
                <div className={cn(
                  'mt-4 p-3 rounded-lg text-sm flex items-center gap-2',
                  spvSyncResult.success
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                )}>
                  {spvSyncResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  {spvSyncResult.message}
                </div>
              )}
            </div>

            {/* How it works */}
            {!spvStatus.connected && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Cum funcționează?</h3>
                <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                  <li>Asigură-te că ai CUI-ul asociației completat în Setări → Asociație</li>
                  <li>Apasă &quot;Conectează la ANAF&quot; pentru a autoriza accesul</li>
                  <li>Te vei autentifica pe portalul ANAF cu certificat digital</li>
                  <li>După autorizare, facturile vor fi descărcate automat zilnic</li>
                </ol>
                <div className="mt-3 p-3 bg-white rounded border border-blue-300">
                  <p className="text-xs text-blue-700">
                    <strong>Notă:</strong> Ai nevoie de un certificat digital valid pentru autentificare ANAF.
                    Contactează-ne dacă ai nevoie de ajutor cu configurarea.
                  </p>
                </div>
              </div>
            )}

            {/* Recent Invoices */}
            {spvStatus.connected && (
              <div className="pt-6 border-t">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Facturi descărcate recent</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchFacturiSPV}
                    disabled={facturiLoading}
                  >
                    {facturiLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {facturiLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : facturiSPV.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
                    <Receipt className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Nu sunt facturi descărcate încă</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={handleSyncSPV}
                      disabled={spvSyncing}
                    >
                      {spvSyncing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Sincronizează acum
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {facturiSPV.map(factura => (
                      <div
                        key={factura.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
                            factura.status === 'NOUA' ? 'bg-blue-100' :
                            factura.status === 'PROCESATA' ? 'bg-green-100' :
                            factura.status === 'IGNORATA' ? 'bg-gray-100' :
                            'bg-red-100'
                          )}>
                            <FileText className={cn(
                              'h-4 w-4',
                              factura.status === 'NOUA' ? 'text-blue-600' :
                              factura.status === 'PROCESATA' ? 'text-green-600' :
                              factura.status === 'IGNORATA' ? 'text-gray-500' :
                              'text-red-600'
                            )} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">
                              {factura.numeFurnizor}
                            </p>
                            <p className="text-xs text-gray-500">
                              {factura.numarFactura} • {new Date(factura.dataFactura).toLocaleDateString('ro-RO')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <p className="font-semibold text-sm">
                            {factura.sumaTotal.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} {factura.moneda}
                          </p>
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            factura.status === 'NOUA' ? 'bg-blue-100 text-blue-700' :
                            factura.status === 'PROCESATA' ? 'bg-green-100 text-green-700' :
                            factura.status === 'IGNORATA' ? 'bg-gray-100 text-gray-600' :
                            'bg-red-100 text-red-700'
                          )}>
                            {factura.status === 'NOUA' ? 'Nouă' :
                             factura.status === 'PROCESATA' ? 'Procesată' :
                             factura.status === 'IGNORATA' ? 'Ignorată' :
                             'Eroare'}
                          </span>
                        </div>
                      </div>
                    ))}

                    {facturiSPV.length >= 10 && (
                      <div className="text-center pt-2">
                        <Button variant="ghost" size="sm">
                          Vezi toate facturile →
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Info about automatic sync */}
            {spvStatus.connected && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Sincronizare automată</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Facturile sunt sincronizate automat în fiecare zi la ora 22:00.
                      Poți sincroniza manual oricând folosind butonul &quot;Sincronizează&quot;.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notificări Tab */}
        {activeTab === 'notificari' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Preferințe notificări</h2>
              <div className="space-y-4 max-w-md">
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">Notificări email</p>
                      <p className="text-sm text-gray-500">Primește alerte pe email</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notificariEmail}
                    onChange={(e) => setSettings({ ...settings, notificariEmail: e.target.checked })}
                    className="h-5 w-5 rounded text-blue-600"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">Notificări SMS</p>
                      <p className="text-sm text-gray-500">Pentru alerte urgente (cost suplimentar)</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notificariSms}
                    onChange={(e) => setSettings({ ...settings, notificariSms: e.target.checked })}
                    className="h-5 w-5 rounded text-blue-600"
                  />
                </label>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">Reminder plată</p>
                      <p className="text-sm text-gray-500">Cu câte zile înainte de scadență</p>
                    </div>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={settings.reminderZile}
                    onChange={(e) => setSettings({ ...settings, reminderZile: parseInt(e.target.value) || 5 })}
                    className="w-24"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvează preferințele
              </Button>
            </div>

            {/* SMTP Configuration Section */}
            <div className="pt-6 border-t">
              <h2 className="text-lg font-semibold mb-4">Configurare Server Email (SMTP)</h2>
              <p className="text-gray-600 mb-4">
                Folosește propriul server SMTP pentru a trimite notificări. Implicit se folosește serviciul BlocHub.
              </p>

              <div className="space-y-4">
                {/* SMTP Configuration Form - Always visible */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
                  {/* Toggle SMTP */}
                  <label className="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer border">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium">Activează server SMTP propriu</p>
                        <p className="text-sm text-gray-500">
                          {smtpConfig.configured ? 'Configurat' : 'Nu este configurat'} -
                          {useSMTP ? ' Activ' : ' Inactiv (folosește BlocHub)'}
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={useSMTP}
                      onChange={(e) => setUseSMTP(e.target.checked)}
                      className="h-5 w-5 rounded text-blue-600"
                    />
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Server SMTP *
                      </label>
                      <Input
                        value={smtpConfig.host}
                        onChange={(e) => setSMTPConfig({ ...smtpConfig, host: e.target.value })}
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Port *
                        </label>
                        <Input
                          type="number"
                          value={smtpConfig.port}
                          onChange={(e) => setSMTPConfig({ ...smtpConfig, port: parseInt(e.target.value) || 587 })}
                          placeholder="587"
                        />
                      </div>
                      <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={smtpConfig.secure}
                            onChange={(e) => setSMTPConfig({ ...smtpConfig, secure: e.target.checked })}
                            className="h-4 w-4 rounded text-blue-600"
                          />
                          <span className="text-sm">SSL/TLS</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Utilizator *
                      </label>
                      <Input
                        value={smtpConfig.user}
                        onChange={(e) => setSMTPConfig({ ...smtpConfig, user: e.target.value })}
                        placeholder="email@domeniu.ro"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Parolă *
                      </label>
                      <Input
                        type="password"
                        value={smtpConfig.password}
                        onChange={(e) => setSMTPConfig({ ...smtpConfig, password: e.target.value })}
                        placeholder={smtpConfig.configured ? '••••••••' : 'Parolă SMTP'}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email expeditor *
                      </label>
                      <Input
                        type="email"
                        value={smtpConfig.fromEmail}
                        onChange={(e) => setSMTPConfig({ ...smtpConfig, fromEmail: e.target.value })}
                        placeholder="notificari@asociatie.ro"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nume expeditor
                      </label>
                      <Input
                        value={smtpConfig.fromName}
                        onChange={(e) => setSMTPConfig({ ...smtpConfig, fromName: e.target.value })}
                        placeholder="Asociația X"
                      />
                    </div>
                  </div>

                  {/* Test SMTP */}
                  <div className="pt-4 border-t border-blue-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">Test conexiune SMTP</p>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        value={smtpTestEmail}
                        onChange={(e) => setSMTPTestEmail(e.target.value)}
                        placeholder="email.test@exemplu.ro"
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={handleTestSMTP}
                        disabled={testingSMTP || !smtpConfig.host || !smtpConfig.user}
                      >
                        {testingSMTP ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Trimite Test'
                        )}
                      </Button>
                    </div>
                    {smtpConfig.lastTest && (
                      <p className={cn(
                        'text-xs mt-2',
                        smtpConfig.lastTestSuccess ? 'text-green-600' : 'text-red-600'
                      )}>
                        Ultimul test: {new Date(smtpConfig.lastTest).toLocaleString('ro-RO')} -
                        {smtpConfig.lastTestSuccess ? ' ✓ Success' : ` ✗ ${smtpConfig.lastTestError || 'Eșuat'}`}
                      </p>
                    )}
                  </div>

                  {/* Result message */}
                  {smtpTestResult && (
                    <div className={cn(
                      'p-3 rounded-lg text-sm',
                      smtpTestResult.success
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    )}>
                      {smtpTestResult.success ? (
                        <Check className="h-4 w-4 inline mr-2" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 inline mr-2" />
                      )}
                      {smtpTestResult.message}
                    </div>
                  )}

                  {/* Save/Delete buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={handleSaveSMTP}
                      disabled={savingSMTP || !smtpConfig.host || !smtpConfig.user || !smtpConfig.fromEmail}
                      className="flex-1"
                    >
                      {savingSMTP ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Salvează configurația SMTP
                    </Button>
                    {smtpConfig.configured && (
                      <Button
                        variant="outline"
                        onClick={handleDeleteSMTP}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Info about SMTP status */}
                  {!useSMTP && (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-sm text-amber-700">
                        <strong>Notă:</strong> Serverul SMTP propriu este dezactivat. Notificările sunt trimise prin serviciul BlocHub.
                        Completează câmpurile de mai sus și activează opțiunea pentru a folosi serverul tău.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Date Tab */}
        {activeTab === 'date' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Export date</h2>
              <p className="text-gray-600 mb-4">
                Descarcă toate datele asociației pentru arhivare sau analiză.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => handleExportData('json')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export JSON
                </Button>
                <Button variant="outline" onClick={() => handleExportData('csv')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export CSV (Excel)
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                CSV poate fi deschis în Excel, Google Sheets sau alte aplicații de calcul tabelar.
              </p>
            </div>

            <div className="pt-6 border-t">
              <h2 className="text-lg font-semibold mb-4 text-red-600">Zonă periculoasă</h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">Șterge toate datele</p>
                    <p className="text-sm text-red-700 mt-1">
                      Această acțiune este ireversibilă. Toate apartamentele, proprietarii,
                      cheltuielile și chitanțele vor fi șterse permanent.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 text-red-600 border-red-300 hover:bg-red-100"
                      onClick={() => alert('Contactează suportul pentru ștergerea contului')}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Șterge datele
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cont Tab */}
        {activeTab === 'cont' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Securitate cont</h2>
              <div className="space-y-4 max-w-md">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Autentificare</p>
                      <p className="text-sm text-gray-500">Email și parolă</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Schimbă parola
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t">
              <h2 className="text-lg font-semibold mb-4">Abonament</h2>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-3 mb-3">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">Plan Gratuit</p>
                    <p className="text-sm text-blue-700">Până la 50 apartamente</p>
                  </div>
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  Upgrade la Pro
                </Button>
              </div>
            </div>

            <div className="pt-6 border-t">
              <h2 className="text-lg font-semibold mb-4">Suport</h2>
              <p className="text-gray-600 mb-4">
                Ai întrebări sau probleme? Folosește chat-ul AI sau contactează-ne.
              </p>
              <div className="flex gap-2">
                <Link href="/dashboard/chat">
                  <Button variant="outline">Chat AI</Button>
                </Link>
                <a href="mailto:support@blochub.ro">
                  <Button variant="outline">Email suport</Button>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Wrapper with Suspense for useSearchParams
export default function SetariPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <SetariContent />
    </Suspense>
  )
}
