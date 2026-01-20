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
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

// Mock data - in production this comes from API
const stats = {
  totalApartamente: 80,
  totalProprietari: 78,
  incasariLuna: 45230,
  cheltuieliLuna: 38100,
  restante: 8450,
  fondRulment: 127450,
}

const alerteAI = [
  {
    tip: 'warning',
    mesaj: '3 apartamente au risc înalt de întârziere (>80%)',
    actiune: 'Trimite remindere',
  },
  {
    tip: 'danger',
    mesaj: 'Apt 42: Consum apă +180% vs. media bloc',
    actiune: 'Verifică scurgere',
  },
  {
    tip: 'info',
    mesaj: 'Factură Enel scadentă în 3 zile',
    actiune: 'Plătește acum',
  },
]

const chitanteRecente = [
  { apartament: '15', suma: 520, status: 'platit' },
  { apartament: '23', suma: 480, status: 'partial' },
  { apartament: '42', suma: 650, status: 'neplatit' },
  { apartament: '7', suma: 390, status: 'platit' },
]

const agentActivity = [
  { agent: 'OCR Facturi', actiuni: 12, ultimaRulare: '2 min' },
  { agent: 'Predictie Plăți', actiuni: 80, ultimaRulare: '1 oră' },
  { agent: 'Remindere Auto', actiuni: 15, ultimaRulare: '30 min' },
  { agent: 'Chatbot', actiuni: 34, ultimaRulare: 'acum' },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Asociația Bloc Mihai Eminescu 23</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/chitante/genereaza">
            <Button>
              <FileText className="h-4 w-4 mr-2" />
              Generează Chitanțe
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Încasări Luna"
          value={`${stats.incasariLuna.toLocaleString('ro-RO')} lei`}
          subtitle="+12% vs. luna trecută"
          icon={<TrendingUp className="h-5 w-5 text-green-600" />}
          trend="up"
        />
        <StatCard
          title="Cheltuieli Luna"
          value={`${stats.cheltuieliLuna.toLocaleString('ro-RO')} lei`}
          subtitle="-5% vs. luna trecută"
          icon={<TrendingDown className="h-5 w-5 text-blue-600" />}
          trend="down"
        />
        <StatCard
          title="Restanțe"
          value={`${stats.restante.toLocaleString('ro-RO')} lei`}
          subtitle="5 apartamente"
          icon={<AlertTriangle className="h-5 w-5 text-orange-600" />}
          trend="warning"
        />
        <StatCard
          title="Fond Rulment"
          value={`${stats.fondRulment.toLocaleString('ro-RO')} lei`}
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
              <span className="badge badge-warning">{alerteAI.length} active</span>
            </div>
            <CardDescription>
              Acțiuni recomandate de sistemul AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerteAI.map((alerta, i) => (
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
                <span className="font-semibold text-green-600">87%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: '87%' }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Chitante */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Chitanțe Recente</CardTitle>
              <Link href="/dashboard/chitante">
                <Button variant="ghost" size="sm">
                  Vezi toate
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {chitanteRecente.map((chitanta, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <span className="font-semibold text-blue-600">
                        {chitanta.apartament}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">Apartament {chitanta.apartament}</p>
                      <p className="text-sm text-gray-500">Ianuarie 2026</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold">{chitanta.suma} lei</span>
                    <StatusBadge status={chitanta.status} />
                  </div>
                </div>
              ))}
            </div>
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
            <div className="space-y-4">
              {agentActivity.map((agent, i) => (
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
                <span className="font-bold text-blue-600">141</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Timp economisit</span>
                <span className="font-bold text-green-600">~12 ore</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
}: {
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'warning'
}) {
  return (
    <Card>
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
