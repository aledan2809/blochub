'use client'

import { useEffect, useState, lazy, Suspense } from 'react'
import {
  Building2,
  Users,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Bot,
  Zap,
  Plus,
  Loader2,
  MessageSquare,
  Wrench,
  ChevronRight,
  Calendar,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useAsociatie } from '@/contexts/AsociatieContext'

// Lazy load analytics charts for better performance
const AnalyticsCharts = lazy(() =>
  import('@/components/dashboard/AnalyticsCharts').then(module => ({
    default: module.AnalyticsCharts
  }))
)

interface DashboardData {
  hasAsociatie: boolean
  asociatie?: {
    id: string
    nume: string
  }
  stats?: {
    totalApartamente: number
    totalProprietari: number
    incasariLuna: number
    cheltuieliLuna: number
    restante: number
    restanteCount: number
    totalObligatiiLuna: number
    fondRulment: number
    tichete?: {
      deschise: number
      inLucru: number
      rezolvate: number
      total: number
    }
  }
  alerteAI: Array<{
    tip: 'warning' | 'danger' | 'info'
    mesaj: string
    actiune: string
  }>
  chitanteRecente: Array<{
    apartament: string
    suma: number
    platit: number
    status: 'platit' | 'partial' | 'neplatit'
  }>
  agentActivity: Array<{
    agent: string
    actiuni: number
    ultimaRulare: string
  }>
  scadente?: Array<{
    id: string
    apartament: string
    suma: number
    dataScadenta: string
    zileRamase: number
    urgenta: 'critica' | 'inalta' | 'medie' | 'scazuta'
  }>
}

const months = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie']

export default function DashboardPage() {
  const { currentAsociatie } = useAsociatie()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    if (!currentAsociatie?.id) return
    async function fetchData() {
      try {
        setLoading(true)
        const res = await fetch(`/api/dashboard/stats?asociatieId=${currentAsociatie!.id}&luna=${selectedMonth}&an=${selectedYear}`)
        if (!res.ok) throw new Error('Eroare la încărcarea datelor')
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Eroare necunoscută')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [currentAsociatie?.id, selectedMonth, selectedYear])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <p className="text-red-600">{error}</p>
        <Button onClick={() => window.location.reload()}>Reîncearcă</Button>
      </div>
    )
  }

  if (!data?.hasAsociatie) {
    return <SetupWizard />
  }

  const stats = data.stats!
  const totalAutomatizari = data.agentActivity.reduce((sum, a) => sum + a.actiuni, 0)
  const rataIncasare = stats.totalObligatiiLuna > 0
    ? Math.round((stats.incasariLuna / stats.totalObligatiiLuna) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">{data.asociatie?.nume || 'Asociația mea'}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5">
            <Calendar className="h-4 w-4 text-gray-500" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="text-sm border-none bg-transparent focus:ring-0 pr-1"
            >
              {months.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="text-sm border-none bg-transparent focus:ring-0 pr-1"
            >
              {[2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <Link href="/dashboard/avizier">
            <Button>
              <FileText className="h-4 w-4 mr-2" />
              Generează Obligații
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href={`/dashboard/incasari?luna=${selectedMonth}&an=${selectedYear}`}>
          <StatCard
            title="Încasări"
            value={`${stats.incasariLuna.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lei`}
            subtitle={`${months[selectedMonth - 1]} ${selectedYear}`}
            icon={<TrendingUp className="h-5 w-5 text-green-600" />}
            trend="up"
            clickable
          />
        </Link>
        <Link href={`/dashboard/cheltuieli?luna=${selectedMonth}&an=${selectedYear}`}>
          <StatCard
            title="Cheltuieli"
            value={`${stats.cheltuieliLuna.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lei`}
            subtitle={`${months[selectedMonth - 1]} ${selectedYear}`}
            icon={<TrendingDown className="h-5 w-5 text-blue-600" />}
            trend="down"
            clickable
          />
        </Link>
        <Link href={`/dashboard/chitante?luna=${selectedMonth}&an=${selectedYear}`}>
          <StatCard
            title="Restanțe"
            value={`${stats.restante.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lei`}
            subtitle={stats.restanteCount > 0 ? `${stats.restanteCount} obligații neplătite` : 'Nicio restanță'}
            icon={<AlertTriangle className="h-5 w-5 text-orange-600" />}
            trend="warning"
            clickable
          />
        </Link>
        <StatCard
          title="Fond Rulment"
          value={`${stats.fondRulment.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lei`}
          subtitle="Sold disponibil"
          icon={<CreditCard className="h-5 w-5 text-purple-600" />}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Alerts */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-600" />
                <CardTitle>Alerte AI</CardTitle>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {data.alerteAI.length} active
              </span>
            </div>
            <CardDescription>
              Acțiuni recomandate de sistemul AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.alerteAI.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>Totul e în regulă! Nu sunt alerte active.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.alerteAI.map((alerta, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      alerta.tip === 'danger'
                        ? 'bg-red-50'
                        : alerta.tip === 'warning'
                        ? 'bg-yellow-50'
                        : 'bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle
                        className={`h-5 w-5 ${
                          alerta.tip === 'danger'
                            ? 'text-red-600'
                            : alerta.tip === 'warning'
                            ? 'text-yellow-600'
                            : 'text-blue-600'
                        }`}
                      />
                      <span className="text-sm text-gray-700">{alerta.mesaj}</span>
                    </div>
                    <Button variant="outline" size="sm">
                      {alerta.actiune}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Sumar Bloc</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <Building2 className="h-4 w-4" />
                  <span>Apartamente</span>
                </div>
                <span className="font-semibold">{stats.totalApartamente}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>Proprietari</span>
                </div>
                <span className="font-semibold">{stats.totalProprietari}</span>
              </div>
              <hr />
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Rata încasare</span>
                <span className={`font-semibold ${rataIncasare >= 80 ? 'text-green-600' : rataIncasare >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {rataIncasare}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${rataIncasare >= 80 ? 'bg-green-600' : rataIncasare >= 50 ? 'bg-yellow-600' : 'bg-red-600'}`}
                  style={{ width: `${rataIncasare}%` }}
                />
              </div>
              {stats.totalApartamente === 0 && (
                <Link href="/dashboard/apartamente">
                  <Button className="w-full mt-2" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Adaugă apartamente
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tickets Summary */}
        {stats.tichete && stats.tichete.total > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-orange-500" />
                  <CardTitle>Sesizări</CardTitle>
                </div>
                <Link href="/dashboard/tichete">
                  <Button variant="ghost" size="sm">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span>Deschise</span>
                  </div>
                  <span className="font-semibold text-red-600">{stats.tichete.deschise}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    <span>În lucru</span>
                  </div>
                  <span className="font-semibold text-yellow-600">{stats.tichete.inLucru}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span>Rezolvate (30 zile)</span>
                  </div>
                  <span className="font-semibold text-green-600">{stats.tichete.rezolvate}</span>
                </div>
                <hr />
                <Link href="/dashboard/tichete">
                  <Button variant="outline" className="w-full" size="sm">
                    <Wrench className="h-4 w-4 mr-2" />
                    Gestionează sesizări
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scadențe Widget */}
        {data.scadente && data.scadente.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <CardTitle>Scadențe Apropiate</CardTitle>
                </div>
                <Link href="/dashboard/chitante">
                  <Button variant="ghost" size="sm">
                    Vezi toate
                  </Button>
                </Link>
              </div>
              <CardDescription>
                Obligații care necesită atenție
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.scadente.slice(0, 5).map((scadenta) => (
                  <div
                    key={scadenta.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      scadenta.urgenta === 'critica'
                        ? 'bg-red-50 border border-red-200'
                        : scadenta.urgenta === 'inalta'
                        ? 'bg-orange-50 border border-orange-200'
                        : scadenta.urgenta === 'medie'
                        ? 'bg-yellow-50 border border-yellow-200'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        scadenta.urgenta === 'critica'
                          ? 'bg-red-100'
                          : scadenta.urgenta === 'inalta'
                          ? 'bg-orange-100'
                          : scadenta.urgenta === 'medie'
                          ? 'bg-yellow-100'
                          : 'bg-gray-100'
                      }`}>
                        <span className={`font-semibold ${
                          scadenta.urgenta === 'critica'
                            ? 'text-red-600'
                            : scadenta.urgenta === 'inalta'
                            ? 'text-orange-600'
                            : scadenta.urgenta === 'medie'
                            ? 'text-yellow-600'
                            : 'text-gray-600'
                        }`}>
                          {scadenta.apartament}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">Apt. {scadenta.apartament}</p>
                        <p className={`text-sm ${
                          scadenta.zileRamase < 0
                            ? 'text-red-600 font-medium'
                            : 'text-gray-500'
                        }`}>
                          {scadenta.zileRamase < 0
                            ? `Restant ${Math.abs(scadenta.zileRamase)} zile`
                            : scadenta.zileRamase === 0
                            ? 'Scadent azi!'
                            : `Scadent în ${scadenta.zileRamase} zile`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`font-semibold ${
                        scadenta.urgenta === 'critica'
                          ? 'text-red-600'
                          : scadenta.urgenta === 'inalta'
                          ? 'text-orange-600'
                          : ''
                      }`}>
                        {scadenta.suma.toLocaleString('ro-RO')} lei
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Obligații de Plată */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Obligații de Plată - {months[selectedMonth - 1]} {selectedYear}</CardTitle>
              <Link href="/dashboard/chitante">
                <Button variant="ghost" size="sm">
                  Vezi toate
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.chitanteRecente.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Nu există obligații de plată pentru {months[selectedMonth - 1]} {selectedYear}.</p>
                <Link href="/dashboard/avizier">
                  <Button className="mt-4" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Generează obligații
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.chitanteRecente.map((chitanta, i) => (
                  <Link key={i} href={`/dashboard/incasari?luna=${selectedMonth}&an=${selectedYear}`}>
                    <div
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <span className="font-semibold text-blue-600">
                            {chitanta.apartament}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">Apt. {chitanta.apartament}</p>
                          <p className="text-sm text-gray-500">
                            {months[selectedMonth - 1]} {selectedYear}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="font-semibold">{chitanta.suma.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lei</span>
                          {chitanta.platit > 0 && chitanta.status !== 'platit' && (
                            <p className="text-xs text-green-600">achitat: {chitanta.platit.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lei</p>
                          )}
                        </div>
                        <StatusBadge status={chitanta.status} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Agent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <CardTitle>Activitate AI Agents</CardTitle>
            </div>
            <CardDescription>Automatizări în ultimele 24h</CardDescription>
          </CardHeader>
          <CardContent>
            {data.agentActivity.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bot className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Agenții AI vor apărea aici după prima utilizare.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.agentActivity.map((agent, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{agent.agent}</p>
                      <p className="text-xs text-gray-500">
                        Ultima: {agent.ultimaRulare}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-green-600">
                        {agent.actiuni}
                      </span>
                      <span className="text-xs text-gray-500">acțiuni</span>
                    </div>
                  </div>
                ))}
                <hr />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total automatizări</span>
                  <span className="font-bold text-blue-600">{totalAutomatizari}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Timp economisit</span>
                  <span className="font-bold text-green-600">~{Math.round(totalAutomatizari * 5)} min</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-8 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-8 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </CardContent>
            </Card>
          </div>
        }
      >
        <AnalyticsCharts stats={stats} selectedMonth={`${months[selectedMonth - 1]} ${selectedYear}`} luna={selectedMonth} an={selectedYear} agentActivity={data.agentActivity} />
      </Suspense>
    </div>
  )
}

interface ScaraConfig {
  numar: string
  nrApartamente: number
  startApt: number
}

interface TipApartamentConfig {
  denumire: string
  nrCamere: number
  suprafata: number
  cotaIndiviza: number
}

function SetupWizard() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nume: '',
    adresa: '',
    oras: '',
    judet: '',
    nrScari: 1,
  })
  const [scari, setScari] = useState<ScaraConfig[]>([{ numar: 'A', nrApartamente: 10, startApt: 1 }])
  const [tipuriApartament, setTipuriApartament] = useState<TipApartamentConfig[]>([])
  const [newTip, setNewTip] = useState({ denumire: '', nrCamere: 2, suprafata: 50, cotaIndiviza: 2.5 })

  const totalApartamente = scari.reduce((sum, s) => sum + s.nrApartamente, 0)

  const handleScariChange = (count: number) => {
    const newScari: ScaraConfig[] = []
    let startApt = 1
    for (let i = 0; i < count; i++) {
      const existing = scari[i]
      const nrApt = existing?.nrApartamente || 10
      newScari.push({
        numar: existing?.numar || String.fromCharCode(65 + i), // A, B, C...
        nrApartamente: nrApt,
        startApt,
      })
      startApt += nrApt
    }
    setScari(newScari)
    setFormData({ ...formData, nrScari: count })
  }

  const updateScara = (index: number, field: keyof ScaraConfig, value: string | number) => {
    const newScari = [...scari]
    newScari[index] = { ...newScari[index], [field]: value }
    // Recalculate startApt
    let startApt = 1
    for (let i = 0; i < newScari.length; i++) {
      newScari[i].startApt = startApt
      startApt += newScari[i].nrApartamente
    }
    setScari(newScari)
  }

  const addTipApartament = () => {
    if (!newTip.denumire) return
    setTipuriApartament([...tipuriApartament, { ...newTip }])
    setNewTip({ denumire: '', nrCamere: 2, suprafata: 50, cotaIndiviza: 2.5 })
  }

  const removeTipApartament = (index: number) => {
    setTipuriApartament(tipuriApartament.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Create association
      const res = await fetch('/api/asociatii', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nume: formData.nume,
          adresa: formData.adresa,
          oras: formData.oras,
          judet: formData.judet,
        })
      })

      if (!res.ok) throw new Error('Eroare la creare asociație')

      const { asociatie } = await res.json()

      // Create clădire
      const cladireRes = await fetch('/api/cladire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nume: 'Clădirea Principală',
          asociatieId: asociatie.id,
        })
      })

      if (!cladireRes.ok) throw new Error('Eroare la creare clădire')

      const { cladire } = await cladireRes.json()

      // Create scari
      const scariRes = await fetch('/api/scari', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asociatieId: asociatie.id,
          cladireId: cladire.id,
          scari: scari.map(s => ({ numar: s.numar, etaje: 10 }))
        })
      })

      if (!scariRes.ok) throw new Error('Eroare la creare scări')
      const { scari: scariCreate } = await scariRes.json()

      // Create tipuri apartament if any
      for (const tip of tipuriApartament) {
        await fetch('/api/tipuri-apartament', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...tip, asociatieId: asociatie.id })
        })
      }

      // Create apartments per scara
      const apartamente: Array<{ numar: string; scaraId: string }> = []
      scari.forEach((s, idx) => {
        const scaraId = scariCreate[idx]?.id
        for (let i = 0; i < s.nrApartamente; i++) {
          apartamente.push({
            numar: String(s.startApt + i),
            scaraId,
          })
        }
      })

      await fetch('/api/apartamente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apartamente, asociatieId: asociatie.id })
      })

      // Reload to show dashboard
      window.location.reload()
    } catch (err) {
      alert('Eroare: ' + (err instanceof Error ? err.message : 'Necunoscută'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Bine ai venit în BlocHub!</CardTitle>
          <CardDescription>
            Să configurăm asociația ta în câțiva pași simpli
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Progress */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className={`h-2 w-12 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
              <div className={`h-2 w-12 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
              <div className={`h-2 w-12 rounded-full ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`} />
              <div className={`h-2 w-12 rounded-full ${step >= 4 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Detalii Asociație</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numele Asociației *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ex: Asociația Bloc Mihai Eminescu 23"
                    value={formData.nume}
                    onChange={(e) => setFormData({ ...formData, nume: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresa *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ex: Str. Mihai Eminescu nr. 23"
                    value={formData.adresa}
                    onChange={(e) => setFormData({ ...formData, adresa: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Oraș *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="ex: București"
                      value={formData.oras}
                      onChange={(e) => setFormData({ ...formData, oras: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Județ *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="ex: București"
                      value={formData.judet}
                      onChange={(e) => setFormData({ ...formData, judet: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  className="w-full"
                  onClick={() => setStep(2)}
                  disabled={!formData.nume || !formData.adresa || !formData.oras || !formData.judet}
                >
                  Continuă
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Configurare Scări</h3>
                <p className="text-sm text-gray-500">Câte scări are clădirea?</p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Număr de scări
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.nrScari}
                    onChange={(e) => handleScariChange(parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="space-y-3">
                  {scari.map((scara, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <span className="text-sm font-medium text-gray-600">Scara</span>
                        <input
                          type="text"
                          className="w-16 ml-2 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          value={scara.numar}
                          onChange={(e) => updateScara(index, 'numar', e.target.value)}
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm text-gray-600">Nr. apartamente:</span>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          className="w-20 ml-2 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          value={scara.nrApartamente}
                          onChange={(e) => updateScara(index, 'nrApartamente', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="text-xs text-gray-400">
                        Apt. {scara.startApt} - {scara.startApt + scara.nrApartamente - 1}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
                  Total: {totalApartamente} apartamente
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                    Înapoi
                  </Button>
                  <Button type="button" className="flex-1" onClick={() => setStep(3)}>
                    Continuă
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Tipuri de Apartamente (opțional)</h3>
                <p className="text-sm text-gray-500">
                  Definește tipurile de apartamente pentru a ușura introducerea datelor
                </p>

                {tipuriApartament.length > 0 && (
                  <div className="space-y-2">
                    {tipuriApartament.map((tip, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <span className="font-medium">{tip.denumire}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            {tip.nrCamere} camere, {tip.suprafata} mp, {tip.cotaIndiviza}%
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTipApartament(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sm">Adaugă tip nou</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Denumire</label>
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        placeholder="ex: 2 camere confort 1"
                        value={newTip.denumire}
                        onChange={(e) => setNewTip({ ...newTip, denumire: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Nr. Camere</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        value={newTip.nrCamere}
                        onChange={(e) => setNewTip({ ...newTip, nrCamere: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Suprafață (mp)</label>
                      <input
                        type="number"
                        min="1"
                        step="0.1"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        value={newTip.suprafata}
                        onChange={(e) => setNewTip({ ...newTip, suprafata: parseFloat(e.target.value) || 1 })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Cotă (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        value={newTip.cotaIndiviza}
                        onChange={(e) => setNewTip({ ...newTip, cotaIndiviza: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={addTipApartament}
                    disabled={!newTip.denumire}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adaugă tip
                  </Button>
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)}>
                    Înapoi
                  </Button>
                  <Button type="button" className="flex-1" onClick={() => setStep(4)}>
                    Continuă
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Rezumat și Finalizare</h3>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Rezumat Configurare</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Asociație: {formData.nume}</li>
                    <li>• Adresă: {formData.adresa}, {formData.oras}, {formData.judet}</li>
                    <li>• Scări: {scari.length} ({scari.map(s => `Scara ${s.numar}`).join(', ')})</li>
                    <li>• Total apartamente: {totalApartamente}</li>
                    {tipuriApartament.length > 0 && (
                      <li>• Tipuri apartament: {tipuriApartament.map(t => t.denumire).join(', ')}</li>
                    )}
                  </ul>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4 text-sm text-yellow-800">
                  <strong>Notă:</strong> După finalizare, poți edita toate datele din setări și poți adăuga proprietari, contoare și alte detalii.
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(3)}>
                    Înapoi
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Se creează...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Finalizează
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  clickable,
}: {
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'warning'
  clickable?: boolean
}) {
  return (
    <Card className={clickable ? 'cursor-pointer hover:shadow-md hover:border-blue-200 transition-all' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p
              className={`text-xs mt-1 ${
                trend === 'up'
                  ? 'text-green-600'
                  : trend === 'down'
                  ? 'text-blue-600'
                  : trend === 'warning'
                  ? 'text-orange-600'
                  : 'text-gray-500'
              }`}
            >
              {subtitle}
            </p>
          </div>
          <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'platit':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle className="h-3 w-3" />
          Plătit
        </span>
      )
    case 'partial':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          <Clock className="h-3 w-3" />
          Parțial
        </span>
      )
    case 'neplatit':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <XCircle className="h-3 w-3" />
          Neplătit
        </span>
      )
    default:
      return null
  }
}
