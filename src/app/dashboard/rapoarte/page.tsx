'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  PieChart,
  Loader2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { exportFinancialReportToPDF, exportFinancialReportToExcel, exportApartamenteToPDF, exportApartamenteToExcel } from '@/lib/export-utils'

export default function RapoartePage() {
  const toast = useToast()
  const [selectedPeriod, setSelectedPeriod] = useState('luna-curenta')
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalIncasari: 0,
    totalCheltuieli: 0,
    rataIncasare: 0,
    restante: 0,
  })
  const [asociatie, setAsociatie] = useState<any>(null)
  const [apartamente, setApartamente] = useState<any[]>([])
  const [fonduri, setFonduri] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [cladireRes, apartamenteRes] = await Promise.all([
        fetch('/api/cladire'),
        fetch('/api/dashboard/stats'),
      ])

      const cladireData = await cladireRes.json()
      const statsData = await apartamenteRes.json()

      if (cladireData.asociatie) {
        setAsociatie(cladireData.asociatie)
      }

      if (statsData.stats) {
        setStats({
          totalIncasari: statsData.stats.incasariLuna || 0,
          totalCheltuieli: statsData.stats.cheltuieliLuna || 0,
          rataIncasare: statsData.stats.totalApartamente > 0
            ? Math.round(((statsData.stats.incasariLuna / (statsData.stats.incasariLuna + statsData.stats.restante)) || 0) * 100)
            : 0,
          restante: statsData.stats.restante || 0,
        })
      }

      // Fetch detailed data for reports
      const [aptRes, fonduriRes] = await Promise.all([
        fetch(`/api/apartamente?asociatieId=${cladireData.asociatie?.id}`),
        fetch('/api/fonduri'),
      ])

      const aptData = await aptRes.json()
      const fonduriData = await fonduriRes.json()

      setApartamente(aptData.apartamente || [])
      setFonduri(fonduriData.fonduri || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Eroare la încărcarea datelor')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateReport(reportId: string, format: string) {
    try {
      toast.info(`Generare raport ${format}...`)

      // Use existing export functions
      if (reportId === 'incasari-lunare' || reportId === 'cheltuieli-categorie' || reportId === 'sold-proprietari' || reportId === 'cashflow') {
        if (format === 'PDF') {
          exportFinancialReportToPDF({
            asociatie,
            apartamente,
            fonduri,
            totalRestante: stats.restante,
          })
        } else {
          exportFinancialReportToExcel({
            asociatie,
            apartamente,
            fonduri,
            totalRestante: stats.restante,
          })
        }
      } else if (reportId === 'restante-apartament' || reportId === 'istoric-plati') {
        if (format === 'PDF') {
          exportApartamenteToPDF(apartamente, asociatie)
        } else {
          exportApartamenteToExcel(apartamente, asociatie)
        }
      } else {
        toast.warning('Raport în dezvoltare')
        return
      }

      toast.success(`Raport ${format} generat cu succes`)
    } catch (error) {
      console.error('Error generating report:', error)
      toast.error('Eroare la generarea raportului')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Rapoarte și Analize</h1>
          <p className="text-gray-500">Statistici detaliate și exporturi</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="luna-curenta">Luna curentă</option>
            <option value="luna-anterioara">Luna anterioară</option>
            <option value="trimestru">Ultimul trimestru</option>
            <option value="an">Ultimul an</option>
            <option value="personalizat">Perioadă personalizată</option>
          </select>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Încasări"
          value={`${stats.totalIncasari.toLocaleString('ro-RO')} lei`}
          change="Luna curentă"
          trend="up"
          icon={<DollarSign className="h-5 w-5 text-green-600" />}
        />
        <StatCard
          title="Total Cheltuieli"
          value={`${stats.totalCheltuieli.toLocaleString('ro-RO')} lei`}
          change="Luna curentă"
          trend="down"
          icon={<TrendingDown className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          title="Rată Încasare"
          value={`${stats.rataIncasare}%`}
          change={stats.rataIncasare >= 80 ? 'Excelent' : stats.rataIncasare >= 60 ? 'Bine' : 'Sub medie'}
          trend={stats.rataIncasare >= 80 ? 'up' : stats.rataIncasare >= 60 ? 'up' : 'down'}
          icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
        />
        <StatCard
          title="Restanțe Active"
          value={`${stats.restante.toLocaleString('ro-RO')} lei`}
          change={`${apartamente.length} apartamente`}
          trend="down"
          icon={<FileText className="h-5 w-5 text-orange-600" />}
        />
      </div>

      {/* Report Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rapoarte Financiare */}
        <ReportCategory
          title="Rapoarte Financiare"
          description="Analize încasări, cheltuieli și balanțe"
          icon={<DollarSign className="h-6 w-6" />}
          reports={[
            { id: 'incasari-lunare', name: 'Încasări pe luni', format: ['PDF', 'Excel'] },
            { id: 'cheltuieli-categorie', name: 'Cheltuieli pe categorie', format: ['PDF', 'Excel'] },
            { id: 'sold-proprietari', name: 'Sold proprietari', format: ['PDF', 'Excel', 'CSV'] },
            { id: 'cashflow', name: 'Cash Flow', format: ['PDF', 'Excel'] },
            { id: 'balanta', name: 'Balanță contabilă', format: ['PDF', 'Excel'] },
          ]}
          onGenerate={handleGenerateReport}
        />

        {/* Rapoarte Apartamente */}
        <ReportCategory
          title="Rapoarte Apartamente"
          description="Statistici proprietari și apartamente"
          icon={<Users className="h-6 w-6" />}
          reports={[
            { id: 'restante-apartament', name: 'Restanțe pe apartament', format: ['PDF', 'Excel'] },
            { id: 'istoric-plati', name: 'Istoric plăți', format: ['PDF', 'Excel', 'CSV'] },
            { id: 'consumuri', name: 'Consumuri utilități', format: ['PDF', 'Excel'] },
            { id: 'rate-plata', name: 'Rate de plată', format: ['PDF', 'Excel'] },
          ]}
          onGenerate={handleGenerateReport}
        />

        {/* Rapoarte Administrative */}
        <ReportCategory
          title="Rapoarte Administrative"
          description="Documente și evidențe"
          icon={<FileText className="h-6 w-6" />}
          reports={[
            { id: 'avg', name: 'Documentație AVG', format: ['PDF', 'Word'] },
            { id: 'evidenta-plati', name: 'Evidență plăți', format: ['PDF', 'Excel'] },
            { id: 'situatie-restante', name: 'Situație restanțe', format: ['PDF', 'Excel'] },
            { id: 'raport-anual', name: 'Raport anual', format: ['PDF'] },
          ]}
          onGenerate={handleGenerateReport}
        />
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Evoluție Încasări vs Cheltuieli</CardTitle>
            <CardDescription>Ultimele 12 luni</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <BarChart3 className="h-16 w-16 text-gray-300" />
              <p className="text-gray-500 ml-4">Grafic interactiv (Chart.js)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuție Cheltuieli</CardTitle>
            <CardDescription>Pe categorii - {selectedPeriod}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <PieChart className="h-16 w-16 text-gray-300" />
              <p className="text-gray-500 ml-4">Grafic Pie (Chart.js)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Rapoarte Generate Recent</CardTitle>
              <CardDescription>Ultimele 10 rapoarte</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Istoric complet
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{report.name}</p>
                    <p className="text-sm text-gray-500">
                      {report.date} • {report.size}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{report.format}</Badge>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  title,
  value,
  change,
  trend,
  icon,
}: {
  title: string
  value: string
  change: string
  trend: 'up' | 'down'
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p
              className={`text-sm mt-1 ${
                trend === 'up' ? 'text-green-600' : 'text-blue-600'
              }`}
            >
              {change} vs luna anterioară
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

function ReportCategory({
  title,
  description,
  icon,
  reports,
  onGenerate,
}: {
  title: string
  description: string
  icon: React.ReactNode
  reports: Array<{ id: string; name: string; format: string[] }>
  onGenerate: (reportId: string, format: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
            {icon}
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {reports.map((report) => (
            <div
              key={report.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium">{report.name}</span>
              <div className="flex gap-1">
                {report.format.map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => onGenerate(report.id, fmt)}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function handleGenerateReport(reportId: string, format: string) {
  console.log(`Generating ${reportId} in ${format} format`)
  // TODO: Implement report generation
  alert(`Se generează raportul ${reportId} în format ${format}...`)
}

const recentReports = [
  {
    id: '1',
    name: 'Încasări pe luni - Noiembrie 2024',
    date: '26 Ian 2026',
    size: '245 KB',
    format: 'Excel',
  },
  {
    id: '2',
    name: 'Sold proprietari - Decembrie 2024',
    date: '25 Ian 2026',
    size: '189 KB',
    format: 'PDF',
  },
  {
    id: '3',
    name: 'Cash Flow - Q4 2024',
    date: '24 Ian 2026',
    size: '312 KB',
    format: 'Excel',
  },
  {
    id: '4',
    name: 'Restanțe pe apartament',
    date: '23 Ian 2026',
    size: '156 KB',
    format: 'PDF',
  },
  {
    id: '5',
    name: 'Cheltuieli pe categorie - 2024',
    date: '22 Ian 2026',
    size: '278 KB',
    format: 'Excel',
  },
]
