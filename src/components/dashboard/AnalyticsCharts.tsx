'use client'

import { memo, useMemo } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface AnalyticsChartsProps {
  stats: {
    incasariLuna: number
    cheltuieliLuna: number
    restante: number
    restanteCount: number
    fondRulment: number
  }
  agentActivity?: Array<{
    agent: string
    actiuni: number
  }>
}

export const AnalyticsCharts = memo(function AnalyticsCharts({ stats, agentActivity = [] }: AnalyticsChartsProps) {
  // Financial overview data - memoized to prevent recalculation on every render
  const financialData = useMemo(() => [
    { name: 'Încasări', value: stats.incasariLuna, color: '#10b981' },
    { name: 'Cheltuieli', value: stats.cheltuieliLuna, color: '#3b82f6' },
    { name: 'Restanțe', value: stats.restante, color: '#f59e0b' },
  ], [stats.incasariLuna, stats.cheltuieliLuna, stats.restante])

  // Monthly trend data (mock data - in real app this would come from API) - memoized
  const monthlyTrend = useMemo(() => [
    { month: 'Ian', incasari: stats.incasariLuna * 0.85, cheltuieli: stats.cheltuieliLuna * 0.9 },
    { month: 'Feb', incasari: stats.incasariLuna * 0.92, cheltuieli: stats.cheltuieliLuna * 0.95 },
    { month: 'Mar', incasari: stats.incasariLuna, cheltuieli: stats.cheltuieliLuna },
  ], [stats.incasariLuna, stats.cheltuieliLuna])

  // Agent activity data - memoized
  const agentData = useMemo(
    () => agentActivity.slice(0, 5).map(agent => ({
      name: agent.agent.replace('Agent', '').trim(),
      actiuni: agent.actiuni,
    })),
    [agentActivity]
  )

  // Payment status distribution - memoized
  const paymentStatusData = useMemo(() => {
    const totalPlati = stats.incasariLuna + stats.restante
    return [
      {
        name: 'Plătit',
        value: stats.incasariLuna,
        percentage: totalPlati > 0 ? Math.round((stats.incasariLuna / totalPlati) * 100) : 0,
      },
      {
        name: 'Restanță',
        value: stats.restante,
        percentage: totalPlati > 0 ? Math.round((stats.restante / totalPlati) * 100) : 0,
      },
    ]
  }, [stats.incasariLuna, stats.restante])

  const COLORS = ['#10b981', '#f59e0b']

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Financial Overview Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Situație Financiară</CardTitle>
          <CardDescription>Rezumat lunar - încasări, cheltuieli, restanțe</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={financialData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value) => [`${Number(value).toLocaleString('ro-RO')} lei`]}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {financialData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Payment Status Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Statut Plăți</CardTitle>
          <CardDescription>Distribuția plăților pentru luna curentă</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.name}: ${entry.percentage}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {paymentStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${Number(value).toLocaleString('ro-RO')} lei`]}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Trend Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Trend Trimestrial</CardTitle>
          <CardDescription>Evoluția încasărilor și cheltuielilor</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value) => [`${Number(value).toLocaleString('ro-RO')} lei`]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="incasari"
                stroke="#10b981"
                strokeWidth={2}
                name="Încasări"
              />
              <Line
                type="monotone"
                dataKey="cheltuieli"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Cheltuieli"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Agent Activity Bar Chart */}
      {agentData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Activitate Agenți AI</CardTitle>
            <CardDescription>Top 5 agenți după număr de acțiuni</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agentData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="actiuni" fill="#8b5cf6" radius={[0, 8, 8, 0]} name="Acțiuni" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
})
