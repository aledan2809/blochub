'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAsociatie } from '@/contexts/AsociatieContext'
import { FileText, Loader2, ChevronLeft, ChevronRight, Search } from 'lucide-react'

interface AuditLogEntry {
  id: string
  userId: string | null
  userName: string | null
  actiune: string
  entitate: string
  entitatId: string | null
  valoriVechi: string | null
  valoriNoi: string | null
  notaExplicativa: string | null
  createdAt: string
}

export default function AuditPage() {
  const { currentAsociatie } = useAsociatie()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    actiune: '',
    entitate: '',
  })
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (currentAsociatie) fetchLogs()
  }, [currentAsociatie, page, filters])

  const fetchLogs = async () => {
    if (!currentAsociatie) return
    setLoading(true)

    const params = new URLSearchParams({
      asociatieId: currentAsociatie.id,
      page: String(page),
      limit: '30',
    })
    if (filters.from) params.set('from', filters.from)
    if (filters.to) params.set('to', filters.to)
    if (filters.actiune) params.set('actiune', filters.actiune)
    if (filters.entitate) params.set('entitate', filters.entitate)

    try {
      const res = await fetch(`/api/audit?${params}`)
      const data = await res.json()
      setLogs(data.logs || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = () => {
    if (!currentAsociatie) return
    const params = new URLSearchParams({ asociatieId: currentAsociatie.id })
    if (filters.from) params.set('from', filters.from)
    if (filters.to) params.set('to', filters.to)
    window.open(`/api/audit/export?${params}`, '_blank')
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ro-RO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const actionLabels: Record<string, string> = {
    CREATE_APARTAMENT: 'Creare unitate',
    UPDATE_APARTAMENT: 'Modificare unitate',
    DELETE_APARTAMENT: 'Ștergere unitate',
    IMPORT_APARTAMENTE: 'Import unități',
    RESET_CONTOR: 'Reset contor',
    SCHIMBARE_FURNIZOR: 'Schimbare furnizor',
    CREATE_CHELTUIALA: 'Creare cheltuială',
    UPDATE_CHELTUIALA: 'Modificare cheltuială',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jurnal Audit</h1>
          <p className="text-sm text-gray-500">Istoric operații cu justificări</p>
        </div>
        <Button onClick={handleExportPDF} variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-gray-500 block mb-1">De la</label>
              <input
                type="date"
                className="border rounded px-3 py-1.5 text-sm"
                value={filters.from}
                onChange={(e) => { setFilters({ ...filters, from: e.target.value }); setPage(1) }}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Până la</label>
              <input
                type="date"
                className="border rounded px-3 py-1.5 text-sm"
                value={filters.to}
                onChange={(e) => { setFilters({ ...filters, to: e.target.value }); setPage(1) }}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Acțiune</label>
              <select
                className="border rounded px-3 py-1.5 text-sm"
                value={filters.actiune}
                onChange={(e) => { setFilters({ ...filters, actiune: e.target.value }); setPage(1) }}
              >
                <option value="">Toate</option>
                {Object.entries(actionLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Entitate</label>
              <select
                className="border rounded px-3 py-1.5 text-sm"
                value={filters.entitate}
                onChange={(e) => { setFilters({ ...filters, entitate: e.target.value }); setPage(1) }}
              >
                <option value="">Toate</option>
                <option value="Apartament">Apartament</option>
                <option value="ImportSession">Import</option>
                <option value="Contor">Contor</option>
                <option value="Cheltuiala">Cheltuială</option>
                <option value="Furnizor">Furnizor</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {total} înregistrări {filters.from || filters.to ? '(filtrate)' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>Nicio înregistrare în jurnal</p>
            </div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => (
                <div key={log.id} className="py-3">
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    <div className="text-xs text-gray-400 w-32 shrink-0">
                      {formatDate(log.createdAt)}
                    </div>
                    <div className="text-sm font-medium text-gray-700 w-28 shrink-0">
                      {log.userName || 'Sistem'}
                    </div>
                    <div className="text-sm text-gray-900 flex-1">
                      <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded mr-2">
                        {actionLabels[log.actiune] || log.actiune}
                      </span>
                      {log.entitate}
                    </div>
                    {log.notaExplicativa && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded shrink-0">
                        cu notă
                      </span>
                    )}
                  </div>

                  {expandedId === log.id && (
                    <div className="mt-2 ml-32 pl-3 border-l-2 border-gray-200 space-y-2">
                      {log.notaExplicativa && (
                        <div className="text-sm">
                          <span className="text-gray-500">Notă:</span>{' '}
                          <span className="text-gray-800">{log.notaExplicativa}</span>
                        </div>
                      )}
                      {log.valoriVechi && (
                        <div className="text-xs">
                          <span className="text-gray-500">Valori vechi:</span>
                          <pre className="bg-red-50 p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(JSON.parse(log.valoriVechi), null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.valoriNoi && (
                        <div className="text-xs">
                          <span className="text-gray-500">Valori noi:</span>
                          <pre className="bg-green-50 p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(JSON.parse(log.valoriNoi), null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <Button
                variant="outline" size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-500">
                Pagina {page} din {totalPages}
              </span>
              <Button
                variant="outline" size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
