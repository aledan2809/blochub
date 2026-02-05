'use client'

import { memo, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface AnalyticsChartsProps {
  stats: {
    incasariLuna: number
    cheltuieliLuna: number
    restante: number
    restanteCount: number
    totalObligatiiLuna: number
    fondRulment: number
  }
  selectedMonth?: string
  agentActivity?: Array<{
    agent: string
    actiuni: number
  }>
}

export const AnalyticsCharts = memo(function AnalyticsCharts({ stats, selectedMonth = '', agentActivity = [] }: AnalyticsChartsProps) {
  const router = useRouter()

  // Navigation map for chart clicks
  const navigationMap: Record<string, string> = {
    'Obligații': '/dashboard/avizier',
    'Încasări': '/dashboard/incasari',
    'Cheltuieli': '/dashboard/cheltuieli',
    'Restanțe': '/dashboard/chitante',
    'Plătit': '/dashboard/incasari',
    'Restanță': '/dashboard/chitante',
  }

  const handleBarClick = (data: { name: string }) => {
    const path = navigationMap[data.name]
    if (path) router.push(path)
  }

  // Financial overview data - memoized to prevent recalculation on every render
  const financialData = useMemo(() => [
    { name: 'Obligații', value: stats.totalObligatiiLuna, color: '#6366f1' },
    { name: 'Încasări', value: stats.incasariLuna, color: '#10b981' },
    { name: 'Cheltuieli', value: stats.cheltuieliLuna, color: '#3b82f6' },
    { name: 'Restanțe', value: stats.restante, color: '#f59e0b' },
  ], [stats.totalObligatiiLuna, stats.incasariLuna, stats.cheltuieliLuna, stats.restante])

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
    const total = stats.totalObligatiiLuna
    return [
      {
        name: 'Plătit',
        value: stats.incasariLuna,
        percentage: total > 0 ? Math.round((stats.incasariLuna / total) * 100) : 0,
      },
      {
        name: 'Restanță',
        value: stats.restante,
        percentage: total > 0 ? Math.round((stats.restante / total) * 100) : 0,
      },
    ]
  }, [stats.incasariLuna, stats.restante, stats.totalObligatiiLuna])

  const COLORS = ['#10b981', '#f59e0b']

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Financial Overview Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Situație Financiară</CardTitle>
          <CardDescription>Rezumat {selectedMonth} - obligații, încasări, cheltuieli, restanțe</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={financialData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value) => [`${Number(value).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lei`]}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} onClick={handleBarClick} style={{ cursor: 'pointer' }}>
                {financialData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity" />
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
          <CardDescription>Distribuția plăților - {selectedMonth}</CardDescription>
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
                onClick={handleBarClick}
                style={{ cursor: 'pointer' }}
              >
                {paymentStatusData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity" />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${Number(value).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lei`]}
              />
            </PieChart>
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
