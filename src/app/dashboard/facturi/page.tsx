'use client'

import { useState, useEffect } from 'react'
import {
  Receipt,
  RefreshCw,
  Search,
  Filter,
  Download,
  Check,
  X,
  Eye,
  FileText,
  AlertTriangle,
  Loader2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Building2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import Link from 'next/link'

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
  cheltuialaId: string | null
  importedAt: string
}

interface FacturiStats {
  NOUA?: { count: number; sum: number }
  PROCESATA?: { count: number; sum: number }
  IGNORATA?: { count: number; sum: number }
  EROARE?: { count: number; sum: number }
}

interface SPVStatus {
  configured: boolean
  connected: boolean
  cui: string | null
  lastSync: string | null
  lastSyncError: string | null
}

export default function FacturiPage() {
  const [facturi, setFacturi] = useState<FacturaSPV[]>([])
  const [stats, setStats] = useState<FacturiStats>({})
  const [spvStatus, setSpvStatus] = useState<SPVStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  // Selected invoice for details
  const [selectedFactura, setSelectedFactura] = useState<FacturaSPV | null>(null)

  useEffect(() => {
    fetchSPVStatus()
    fetchFacturi()
  }, [page, statusFilter])

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

  const fetchFacturi = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }

      const res = await fetch(`/api/spv/facturi?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setFacturi(data.facturi || [])
        setStats(data.stats || {})
        setTotalPages(data.pagination?.totalPages || 1)
        setTotal(data.pagination?.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch facturi:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/spv/sync', { method: 'POST' })
      const data = await res.json()

      if (res.ok) {
        setSyncResult({
          success: data.success,
          message: data.success
            ? `Sincronizare completă: ${data.imported} facturi noi importate`
            : `Erori la sincronizare: ${data.errors?.join(', ')}`
        })
        fetchFacturi()
        fetchSPVStatus()
      } else {
        setSyncResult({ success: false, message: data.error || 'Eroare la sincronizare' })
      }
    } catch (error) {
      setSyncResult({ success: false, message: 'Eroare la sincronizarea facturilor' })
    } finally {
      setSyncing(false)
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: 'PROCESATA' | 'IGNORATA') => {
    try {
      const res = await fetch('/api/spv/facturi', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      })

      if (res.ok) {
        fetchFacturi()
        if (selectedFactura?.id === id) {
          setSelectedFactura(null)
        }
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const filteredFacturi = facturi.filter(f => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      f.numeFurnizor.toLowerCase().includes(query) ||
      f.numarFactura.toLowerCase().includes(query) ||
      f.cuiFurnizor.includes(query)
    )
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NOUA': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'PROCESATA': return 'bg-green-100 text-green-700 border-green-200'
      case 'IGNORATA': return 'bg-gray-100 text-gray-600 border-gray-200'
      case 'EROARE': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'NOUA': return 'Nouă'
      case 'PROCESATA': return 'Procesată'
      case 'IGNORATA': return 'Ignorată'
      case 'EROARE': return 'Eroare'
      default: return status
    }
  }

  const totalNoi = stats.NOUA?.count || 0
  const sumaNoi = stats.NOUA?.sum || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="h-7 w-7 text-blue-600" />
            Facturi SPV / e-Factura
          </h1>
          <p className="text-gray-600 mt-1">
            Facturi descărcate automat din sistemul ANAF
          </p>
        </div>
        <div className="flex items-center gap-3">
          {spvStatus?.connected ? (
            <Button onClick={handleSync} disabled={syncing}>
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sincronizează
            </Button>
          ) : (
            <Link href="/dashboard/setari?tab=fiscal">
              <Button>
                <ExternalLink className="h-4 w-4 mr-2" />
                Conectează SPV
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Sync Result */}
      {syncResult && (
        <div className={cn(
          'p-3 rounded-lg text-sm flex items-center gap-2',
          syncResult.success
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        )}>
          {syncResult.success ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {syncResult.message}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter('all')}
          className={cn(
            'p-4 rounded-xl border-2 cursor-pointer transition-all',
            statusFilter === 'all' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          )}
        >
          <p className="text-sm text-gray-600">Total facturi</p>
          <p className="text-2xl font-bold">{total}</p>
        </div>
        <div
          onClick={() => setStatusFilter('NOUA')}
          className={cn(
            'p-4 rounded-xl border-2 cursor-pointer transition-all',
            statusFilter === 'NOUA' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          )}
        >
          <p className="text-sm text-blue-600">Noi (neprocesate)</p>
          <p className="text-2xl font-bold text-blue-700">{totalNoi}</p>
          <p className="text-xs text-blue-600">{sumaNoi.toLocaleString('ro-RO')} RON</p>
        </div>
        <div
          onClick={() => setStatusFilter('PROCESATA')}
          className={cn(
            'p-4 rounded-xl border-2 cursor-pointer transition-all',
            statusFilter === 'PROCESATA' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
          )}
        >
          <p className="text-sm text-green-600">Procesate</p>
          <p className="text-2xl font-bold text-green-700">{stats.PROCESATA?.count || 0}</p>
        </div>
        <div
          onClick={() => setStatusFilter('IGNORATA')}
          className={cn(
            'p-4 rounded-xl border-2 cursor-pointer transition-all',
            statusFilter === 'IGNORATA' ? 'border-gray-500 bg-gray-100' : 'border-gray-200 hover:border-gray-300'
          )}
        >
          <p className="text-sm text-gray-600">Ignorate</p>
          <p className="text-2xl font-bold text-gray-700">{stats.IGNORATA?.count || 0}</p>
        </div>
      </div>

      {/* SPV Not Connected Warning */}
      {spvStatus && !spvStatus.connected && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">SPV nu este conectat</p>
              <p className="text-sm text-amber-700 mt-1">
                Pentru a descărca facturi automat din ANAF, conectează-te la sistemul SPV din
                <Link href="/dashboard/setari?tab=fiscal" className="underline ml-1">Setări → Fiscal</Link>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Caută după furnizor, număr factură sau CUI..."
            className="pl-10"
          />
        </div>
        {spvStatus?.lastSync && (
          <p className="text-sm text-gray-500">
            Ultima sincronizare: {new Date(spvStatus.lastSync).toLocaleString('ro-RO')}
          </p>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filteredFacturi.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {statusFilter !== 'all'
                ? `Nu sunt facturi cu status "${getStatusLabel(statusFilter)}"`
                : 'Nu sunt facturi descărcate încă'}
            </p>
            {spvStatus?.connected && (
              <Button variant="outline" className="mt-4" onClick={handleSync} disabled={syncing}>
                {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Sincronizează acum
              </Button>
            )}
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Furnizor</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Nr. Factură</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Data</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Sumă</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredFacturi.map((factura) => (
                  <tr key={factura.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{factura.numeFurnizor}</p>
                        <p className="text-xs text-gray-500">CUI: {factura.cuiFurnizor}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-sm">{factura.numarFactura}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{new Date(factura.dataFactura).toLocaleDateString('ro-RO')}</p>
                      {factura.dataScadenta && (
                        <p className="text-xs text-gray-500">
                          Scadență: {new Date(factura.dataScadenta).toLocaleDateString('ro-RO')}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-semibold">
                        {factura.sumaTotal.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} {factura.moneda}
                      </p>
                      {factura.sumaTVA && (
                        <p className="text-xs text-gray-500">
                          TVA: {factura.sumaTVA.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        'px-2 py-1 text-xs font-medium rounded-full border',
                        getStatusColor(factura.status)
                      )}>
                        {getStatusLabel(factura.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedFactura(factura)}
                          title="Vezi detalii"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {factura.status === 'NOUA' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateStatus(factura.id, 'PROCESATA')}
                              title="Marchează ca procesată"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateStatus(factura.id, 'IGNORATA')}
                              title="Ignoră factura"
                              className="text-gray-500 hover:text-gray-600"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                <p className="text-sm text-gray-600">
                  Pagina {page} din {totalPages} ({total} facturi)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedFactura && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedFactura(null)} />
          <div className="relative bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Detalii factură</h2>
              <button
                onClick={() => setSelectedFactura(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Status</span>
                <span className={cn(
                  'px-3 py-1 text-sm font-medium rounded-full border',
                  getStatusColor(selectedFactura.status)
                )}>
                  {getStatusLabel(selectedFactura.status)}
                </span>
              </div>

              {/* Furnizor */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Furnizor</p>
                <p className="font-medium">{selectedFactura.numeFurnizor}</p>
                <p className="text-sm text-gray-500">CUI: {selectedFactura.cuiFurnizor}</p>
              </div>

              {/* Factură */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Număr factură</p>
                  <p className="font-mono font-medium">{selectedFactura.numarFactura}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Data facturii</p>
                  <p className="font-medium">{new Date(selectedFactura.dataFactura).toLocaleDateString('ro-RO')}</p>
                </div>
              </div>

              {/* Sume */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-blue-700">Total</span>
                  <span className="text-xl font-bold text-blue-900">
                    {selectedFactura.sumaTotal.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} {selectedFactura.moneda}
                  </span>
                </div>
                {selectedFactura.sumaTVA && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-600">din care TVA</span>
                    <span className="text-blue-700">
                      {selectedFactura.sumaTVA.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} {selectedFactura.moneda}
                    </span>
                  </div>
                )}
              </div>

              {/* Date adiționale */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {selectedFactura.dataScadenta && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 mb-1">Scadență</p>
                    <p className="font-medium">{new Date(selectedFactura.dataScadenta).toLocaleDateString('ro-RO')}</p>
                  </div>
                )}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-600 mb-1">Importată la</p>
                  <p className="font-medium">{new Date(selectedFactura.importedAt).toLocaleString('ro-RO')}</p>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">ID SPV</p>
                <p className="font-mono text-xs text-gray-500 break-all">{selectedFactura.spvId}</p>
              </div>

              {/* Actions */}
              {selectedFactura.status === 'NOUA' && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleUpdateStatus(selectedFactura.id, 'PROCESATA')}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Marchează procesată
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedFactura.id, 'IGNORATA')}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Ignoră
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
