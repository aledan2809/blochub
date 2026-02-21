'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  FileText,
  Printer,
  Download,
  Loader2,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  Info,
  Settings,
  FileDown,
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAsociatie } from '@/contexts/AsociatieContext'

interface Apartament {
  numar: string
  scara?: string
  proprietar?: string
  cheltuieli: Record<string, number>
  totalIntretinere: number
  restanta: number
  penalizari: number
  fonduri: number
  total: number
}

interface AvizierData {
  asociatie: {
    nume: string
    adresa: string
    ziScadenta: number
    penalizareZi: number
  }
  luna: number
  an: number
  categoriiCheltuieli: string[]
  apartamente: Apartament[]
  totaluri: {
    categorii: Record<string, number>
    intretinere: number
    restante: number
    penalizari: number
    fonduri: number
    total: number
  }
  hasExpenses?: boolean
}

const months = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
]

// Unique short codes for expense categories
const categoryShortCodes: Record<string, string> = {
  'Apă rece': 'AR',
  'Apă caldă': 'AC',
  'Canalizare': 'CN',
  'Gaz': 'G',
  'Curent comun': 'CC',
  'Gunoi': 'GN',
  'Lift': 'LF',
  'Salubritate': 'SL',
  'Întreținere': 'ÎN',
  'Administrator': 'AD',
  'Fond reparații': 'FR',
  'Fond rulment': 'FRL',
  'Alte cheltuieli': 'ALT',
}

function getCategoryShortCode(category: string): string {
  return categoryShortCodes[category] || category.substring(0, 2).toUpperCase()
}

export default function AvizierPage() {
  const { currentAsociatie } = useAsociatie()
  const searchParams = useSearchParams()
  const [data, setData] = useState<AvizierData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  // Initialize from URL params or default to current month
  const urlLuna = searchParams.get('luna')
  const urlAn = searchParams.get('an')
  const [selectedMonth, setSelectedMonth] = useState(urlLuna ? parseInt(urlLuna) : new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(urlAn ? parseInt(urlAn) : new Date().getFullYear())
  const printRef = useRef<HTMLDivElement>(null)

  const asociatieId = currentAsociatie?.id || null

  useEffect(() => {
    if (currentAsociatie?.id) {
      fetchAvizier()
    }
  }, [selectedMonth, selectedYear, currentAsociatie?.id])

  async function fetchAvizier() {
    if (!currentAsociatie?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/avizier?luna=${selectedMonth}&an=${selectedYear}&asociatieId=${currentAsociatie.id}`)
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error('Error fetching avizier:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExport = async (format: 'xlsx' | 'csv') => {
    if (!asociatieId) return
    try {
      const res = await fetch(`/api/avizier/export?luna=${selectedMonth}&an=${selectedYear}&format=${format}&asociatieId=${asociatieId}`)
      if (!res.ok) {
        throw new Error('Export failed')
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `avizier-${selectedMonth}-${selectedYear}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Export error:', err)
      alert('Eroare la export. Încearcă din nou.')
    }
  }

  const handleExportPDF = () => {
    if (!data) return

    // Create PDF in landscape A4
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 10

    // Header
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(data.asociatie.nume, pageWidth / 2, 15, { align: 'center' })

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(data.asociatie.adresa, pageWidth / 2, 21, { align: 'center' })

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`AVIZIER - ${months[selectedMonth - 1]} ${selectedYear}`, pageWidth / 2, 30, { align: 'center' })

    // Summary boxes
    const summaryY = 36
    const boxWidth = 45
    const boxHeight = 14
    const boxSpacing = 5
    const startX = (pageWidth - (4 * boxWidth + 3 * boxSpacing)) / 2

    // Box 1: Întreținere
    doc.setFillColor(219, 234, 254) // blue-100
    doc.rect(startX, summaryY, boxWidth, boxHeight, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Total Întreținere', startX + boxWidth / 2, summaryY + 4, { align: 'center' })
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`${data.totaluri.intretinere.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} lei`, startX + boxWidth / 2, summaryY + 10, { align: 'center' })

    // Box 2: Restanțe
    doc.setFillColor(254, 243, 199) // orange-100
    doc.rect(startX + boxWidth + boxSpacing, summaryY, boxWidth, boxHeight, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Total Restanțe', startX + boxWidth + boxSpacing + boxWidth / 2, summaryY + 4, { align: 'center' })
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`${data.totaluri.restante.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} lei`, startX + boxWidth + boxSpacing + boxWidth / 2, summaryY + 10, { align: 'center' })

    // Box 3: Penalizări
    doc.setFillColor(254, 226, 226) // red-100
    doc.rect(startX + 2 * (boxWidth + boxSpacing), summaryY, boxWidth, boxHeight, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Total Penalizări', startX + 2 * (boxWidth + boxSpacing) + boxWidth / 2, summaryY + 4, { align: 'center' })
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`${data.totaluri.penalizari.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} lei`, startX + 2 * (boxWidth + boxSpacing) + boxWidth / 2, summaryY + 10, { align: 'center' })

    // Box 4: Total
    doc.setFillColor(187, 247, 208) // green-200
    doc.rect(startX + 3 * (boxWidth + boxSpacing), summaryY, boxWidth, boxHeight, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Total General', startX + 3 * (boxWidth + boxSpacing) + boxWidth / 2, summaryY + 4, { align: 'center' })
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`${data.totaluri.total.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} lei`, startX + 3 * (boxWidth + boxSpacing) + boxWidth / 2, summaryY + 10, { align: 'center' })

    // Main Table
    const tableHeaders = [
      'Apt.',
      'Scara',
      ...data.categoriiCheltuieli.map(cat => getCategoryShortCode(cat)),
      'Întreț.',
      'Rest.',
      'Pen.',
      'Fond.',
      'TOTAL'
    ]

    const tableData = data.apartamente.map(apt => [
      apt.numar,
      apt.scara || '-',
      ...data.categoriiCheltuieli.map(cat =>
        apt.cheltuieli[cat] ? apt.cheltuieli[cat].toFixed(2) : '-'
      ),
      apt.totalIntretinere.toFixed(2),
      apt.restanta > 0 ? apt.restanta.toFixed(2) : '-',
      apt.penalizari > 0 ? apt.penalizari.toFixed(2) : '-',
      apt.fonduri > 0 ? apt.fonduri.toFixed(2) : '-',
      apt.total.toFixed(2)
    ])

    // Totals row
    const totalsRow = [
      'TOTAL',
      '',
      ...data.categoriiCheltuieli.map(cat =>
        data.totaluri.categorii[cat] ? data.totaluri.categorii[cat].toFixed(2) : '-'
      ),
      data.totaluri.intretinere.toFixed(2),
      data.totaluri.restante.toFixed(2),
      data.totaluri.penalizari.toFixed(2),
      data.totaluri.fonduri.toFixed(2),
      data.totaluri.total.toFixed(2)
    ]

    autoTable(doc, {
      head: [tableHeaders],
      body: [...tableData, totalsRow],
      startY: summaryY + boxHeight + 5,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        halign: 'center',
        valign: 'middle'
      },
      headStyles: {
        fillColor: [229, 231, 235], // gray-200
        textColor: [17, 24, 39], // gray-900
        fontStyle: 'bold',
        fontSize: 7
      },
      bodyStyles: {
        fontSize: 7
      },
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold' }, // Apt
        1: { halign: 'center' }, // Scara
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251] // gray-50
      },
      didParseCell: function(hookData) {
        const row = hookData.row.index
        const col = hookData.column.index
        const isLastRow = row === tableData.length

        // Style totals row
        if (isLastRow) {
          hookData.cell.styles.fillColor = [229, 231, 235] // gray-200
          hookData.cell.styles.fontStyle = 'bold'
        }

        // Highlight restanță column if has value
        if (col === tableHeaders.indexOf('Rest.') && hookData.section === 'body' && !isLastRow) {
          const restanta = data.apartamente[row]?.restanta || 0
          if (restanta > 0) {
            hookData.cell.styles.fillColor = [254, 243, 199] // orange-100
            hookData.cell.styles.fontStyle = 'bold'
          }
        }

        // Highlight TOTAL column
        if (col === tableHeaders.length - 1 && hookData.section === 'body') {
          hookData.cell.styles.fillColor = isLastRow ? [187, 247, 208] : [220, 252, 231] // green shades
          hookData.cell.styles.fontStyle = 'bold'
        }
      }
    })

    // Legend
    const finalY = (doc as any).lastAutoTable.finalY + 5
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text('Legendă: ' + data.categoriiCheltuieli.map(cat => `${getCategoryShortCode(cat)}=${cat}`).join(', '), margin, finalY)

    // Footer
    doc.setFontSize(8)
    doc.text(`Generat de BlocHub la ${new Date().toLocaleDateString('ro-RO')}`, margin, pageHeight - 5)
    doc.text(`Zi scadență: ${data.asociatie.ziScadenta} | Penalizare: ${data.asociatie.penalizareZi}%/zi`, pageWidth - margin, pageHeight - 5, { align: 'right' })

    // Save
    doc.save(`avizier-${selectedMonth}-${selectedYear}.pdf`)
  }

  const handleGenerateChitante = async () => {
    if (!asociatieId) return
    if (!confirm(`Sigur vrei să generezi obligațiile de plată pentru ${months[selectedMonth - 1]} ${selectedYear}?\n\nAceastă operațiune va crea obligații pentru toate apartamentele bazate pe calculul din avizier.`)) {
      return
    }

    setGenerating(true)
    try {
      const res = await fetch('/api/chitante/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ luna: selectedMonth, an: selectedYear, asociatieId }),
      })

      if (res.ok) {
        alert('Obligații de plată generate cu succes!')
        fetchAvizier() // Refresh data
      } else {
        const data = await res.json()
        alert('Eroare: ' + (data.error || 'Nu s-au putut genera obligațiile'))
      }
    } catch (err) {
      console.error('Error generating chitante:', err)
      alert('Eroare la generarea obligațiilor de plată')
    } finally {
      setGenerating(false)
    }
  }

  const prevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  const nextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1)
      setSelectedYear(selectedYear + 1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nu există date pentru avizier
          </h3>
          <p className="text-gray-500">
            Configurează asociația pentru a vedea avizierul.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!data.hasExpenses || data.apartamente.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Avizier</h1>
            <p className="text-gray-500">{data.asociatie.nume}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {months[selectedMonth - 1]} {selectedYear}
            </span>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {data.apartamente.length === 0
                ? 'Nu există apartamente înregistrate'
                : `Nu există cheltuieli pentru ${months[selectedMonth - 1]} ${selectedYear}`}
            </h3>
            <p className="text-gray-500 mb-4">
              {data.apartamente.length === 0
                ? 'Adaugă apartamente pentru a putea genera avizierul.'
                : 'Adaugă cheltuieli pentru această lună pentru a calcula repartizarea pe apartamente.'}
            </p>
            {data.apartamente.length === 0 ? (
              <Button onClick={() => window.location.href = '/dashboard/apartamente'}>
                Adaugă apartamente
              </Button>
            ) : (
              <Button onClick={() => window.location.href = '/dashboard/cheltuieli'}>
                Adaugă cheltuieli
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header - Hidden when printing */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Avizier</h1>
          <p className="text-gray-500">{data.asociatie.nume}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {months[selectedMonth - 1]} {selectedYear}
            </span>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleGenerateChitante} disabled={generating} className="text-xs sm:text-sm">
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 sm:mr-2 animate-spin" />
                  <span className="hidden sm:inline">Generează...</span>
                  <span className="sm:hidden">...</span>
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Generează obligații</span>
                  <span className="sm:hidden">Obligații</span>
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="text-xs sm:text-sm bg-red-50 border-red-200 text-red-700 hover:bg-red-100">
              <FileDown className="h-4 w-4 mr-1" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('xlsx')} className="text-xs sm:text-sm">
              <Download className="h-4 w-4 mr-1" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('csv')} className="text-xs sm:text-sm">
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
            <Button size="sm" onClick={handlePrint} className="text-xs sm:text-sm">
              <Printer className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Printează A3</span>
              <span className="sm:hidden">Print</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Printable Avizier */}
      <div ref={printRef} className="print:p-0">
        {/* Header for print */}
        <div className="hidden print:block mb-4">
          <div className="text-center">
            <h1 className="text-xl font-bold">{data.asociatie.nume}</h1>
            <p className="text-sm">{data.asociatie.adresa}</p>
            <p className="text-lg font-semibold mt-2">
              AVIZIER - {months[selectedMonth - 1]} {selectedYear}
            </p>
          </div>
        </div>

        {/* Summary Card */}
        <Card className="mb-6 print:shadow-none print:border">
          <CardHeader className="print:py-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Sumar Cheltuieli - {months[selectedMonth - 1]} {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent className="print:py-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:gap-2">
              <div className="p-3 bg-blue-50 rounded-lg print:p-1">
                <p className="text-xs text-blue-600 font-medium">Total Întreținere</p>
                <p className="text-xl font-bold text-blue-900 print:text-lg">
                  {data.totaluri.intretinere.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lei
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg print:p-1 border-2 border-orange-200">
                <p className="text-xs text-orange-600 font-medium flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Total Restanțe
                </p>
                <p className="text-xl font-bold text-orange-900 print:text-lg">
                  {data.totaluri.restante.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lei
                </p>
                <p className="text-[10px] text-orange-700 mt-1">
                  {data.apartamente.filter(apt => apt.restanta > 0).length} apartamente
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg print:p-1">
                <p className="text-xs text-red-600 font-medium">Total Penalizări</p>
                <p className="text-xl font-bold text-red-900 print:text-lg">
                  {data.totaluri.penalizari.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lei
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg print:p-1">
                <p className="text-xs text-green-600 font-medium">Total General</p>
                <p className="text-xl font-bold text-green-900 print:text-lg">
                  {data.totaluri.total.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lei
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Outstanding Balance Alert */}
        {data.apartamente.filter(apt => apt.restanta > 0).length > 0 && (
          <Card className="mb-6 border-orange-200 bg-orange-50 print:shadow-none print:border">
            <CardContent className="py-4 print:py-2">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-900 mb-2">
                    Apartamente cu restanțe ({data.apartamente.filter(apt => apt.restanta > 0).length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {data.apartamente
                      .filter(apt => apt.restanta > 0)
                      .sort((a, b) => b.restanta - a.restanta)
                      .slice(0, 10)
                      .map(apt => (
                        <div
                          key={apt.numar}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-md border border-orange-200 text-sm"
                        >
                          <span className="font-semibold text-orange-900">Ap. {apt.numar}</span>
                          <span className="text-orange-700">{apt.restanta.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lei</span>
                        </div>
                      ))}
                    {data.apartamente.filter(apt => apt.restanta > 0).length > 10 && (
                      <span className="text-sm text-orange-700 self-center">
                        + {data.apartamente.filter(apt => apt.restanta > 0).length - 10} mai multe
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Penalty Information */}
        {data.totaluri.penalizari > 0 && (
          <Card className="mb-6 border-red-200 bg-red-50 print:shadow-none print:border">
            <CardContent className="py-4 print:py-2">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                    Informații despre penalizări
                  </h3>
                  <div className="text-sm text-red-800 space-y-2">
                    <p>
                      Penalizările sunt calculate automat pentru plățile întârziate după ziua de <strong>{data.asociatie.ziScadenta}</strong> a fiecărei luni.
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>Rată penalizare:</span>
                      <span className="font-semibold bg-white px-2 py-1 rounded border border-red-300">
                        {data.asociatie.penalizareZi}% pe zi
                      </span>
                      <span className="text-xs text-red-700">
                        (exemplu: 1000 lei × {data.asociatie.penalizareZi}% × 30 zile = {(1000 * data.asociatie.penalizareZi / 100 * 30).toFixed(2)} lei)
                      </span>
                    </div>
                    <div className="flex gap-2 print:hidden">
                      <Link href="/dashboard/setari">
                        <Button size="sm" variant="outline" className="text-red-700 border-red-300 hover:bg-red-100">
                          <Settings className="h-3 w-3 mr-1" />
                          Modifică setările
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Expense Categories Summary */}
        <Card className="mb-6 print:shadow-none print:border">
          <CardHeader className="print:py-2">
            <CardTitle className="text-lg">Defalcare pe Categorii</CardTitle>
          </CardHeader>
          <CardContent className="print:py-2">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 print:gap-1">
              {Object.entries(data.totaluri.categorii).map(([categorie, suma]) => (
                <div key={categorie} className="p-2 bg-gray-50 rounded print:p-1 print:text-xs">
                  <p className="text-xs text-gray-600 truncate">{categorie}</p>
                  <p className="font-semibold">{suma.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lei</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Table */}
        <Card className="print:shadow-none print:border">
          <CardContent className="p-0 print:p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm print:text-[8pt]">
                <thead className="bg-gray-100 print:bg-gray-200">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold border-b sticky left-0 bg-gray-100 print:bg-gray-200 print:px-1 print:py-1">
                      Apt.
                    </th>
                    <th className="px-2 py-2 text-left font-semibold border-b print:px-1 print:py-1 hidden md:table-cell print:table-cell">
                      Scara
                    </th>
                    <th className="px-2 py-2 text-left font-semibold border-b print:px-1 print:py-1 hidden lg:table-cell print:table-cell">
                      Proprietar
                    </th>
                    {data.categoriiCheltuieli.map(cat => (
                      <th key={cat} className="px-2 py-2 text-right font-semibold border-b print:px-1 print:py-1">
                        <span className="truncate block max-w-[80px]" title={cat}>
                          {getCategoryShortCode(cat)}
                        </span>
                      </th>
                    ))}
                    <th className="px-2 py-2 text-right font-semibold border-b bg-blue-50 print:px-1 print:py-1">
                      Întreț.
                    </th>
                    <th className="px-2 py-2 text-right font-semibold border-b bg-orange-50 print:px-1 print:py-1">
                      Rest.
                    </th>
                    <th className="px-2 py-2 text-right font-semibold border-b bg-red-50 print:px-1 print:py-1">
                      Pen.
                    </th>
                    <th className="px-2 py-2 text-right font-semibold border-b bg-purple-50 print:px-1 print:py-1">
                      Fond.
                    </th>
                    <th className="px-2 py-2 text-right font-semibold border-b bg-green-100 print:px-1 print:py-1">
                      TOTAL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.apartamente.map((apt, idx) => {
                    const hasRestanta = apt.restanta > 0
                    const rowClass = hasRestanta
                      ? 'bg-orange-50/30 border-l-4 border-orange-400'
                      : idx % 2 === 0
                      ? 'bg-white'
                      : 'bg-gray-50'

                    return (
                      <tr key={apt.numar} className={rowClass}>
                        <td className="px-2 py-1.5 border-b font-medium sticky left-0 bg-inherit print:px-1 print:py-0.5">
                          <div className="flex items-center gap-1">
                            {hasRestanta && (
                              <AlertCircle className="h-3 w-3 text-orange-600 flex-shrink-0 print:hidden" />
                            )}
                            <span className={hasRestanta ? 'font-bold' : ''}>{apt.numar}</span>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 border-b text-gray-600 print:px-1 print:py-0.5 hidden md:table-cell print:table-cell">
                          {apt.scara || '-'}
                        </td>
                        <td className="px-2 py-1.5 border-b text-gray-600 truncate max-w-[120px] print:px-1 print:py-0.5 hidden lg:table-cell print:table-cell">
                          {apt.proprietar || '-'}
                        </td>
                        {data.categoriiCheltuieli.map(cat => (
                          <td key={cat} className="px-2 py-1.5 border-b text-right print:px-1 print:py-0.5">
                            {apt.cheltuieli[cat]?.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '-'}
                          </td>
                        ))}
                        <td className="px-2 py-1.5 border-b text-right bg-blue-50 font-medium print:px-1 print:py-0.5">
                          {apt.totalIntretinere.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className={`px-2 py-1.5 border-b text-right ${hasRestanta ? 'bg-orange-100' : 'bg-orange-50'} print:px-1 print:py-0.5`}>
                          {apt.restanta > 0 ? (
                            <span className="font-bold text-orange-900">
                              {apt.restanta.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-2 py-1.5 border-b text-right bg-red-50 print:px-1 print:py-0.5">
                          {apt.penalizari > 0 ? (
                            <span className="font-semibold text-red-900">
                              {apt.penalizari.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-2 py-1.5 border-b text-right bg-purple-50 print:px-1 print:py-0.5">
                          {apt.fonduri > 0 ? apt.fonduri.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className="px-2 py-1.5 border-b text-right bg-green-100 font-bold print:px-1 print:py-0.5">
                          {apt.total.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )
                  })}
                  {/* Totals Row */}
                  <tr className="bg-gray-200 font-bold print:bg-gray-300">
                    <td className="px-2 py-2 border-t-2 sticky left-0 bg-gray-200 print:bg-gray-300 print:px-1">
                      TOTAL
                    </td>
                    <td className="px-2 py-2 border-t-2 print:px-1 hidden md:table-cell print:table-cell">-</td>
                    <td className="px-2 py-2 border-t-2 print:px-1 hidden lg:table-cell print:table-cell">-</td>
                    {data.categoriiCheltuieli.map(cat => (
                      <td key={cat} className="px-2 py-2 border-t-2 text-right print:px-1">
                        {data.totaluri.categorii[cat]?.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '-'}
                      </td>
                    ))}
                    <td className="px-2 py-2 border-t-2 text-right bg-blue-100 print:px-1">
                      {data.totaluri.intretinere.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-2 border-t-2 text-right bg-orange-100 print:px-1">
                      {data.totaluri.restante.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-2 border-t-2 text-right bg-red-100 print:px-1">
                      {data.totaluri.penalizari.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-2 border-t-2 text-right bg-purple-100 print:px-1">
                      {data.totaluri.fonduri.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-2 border-t-2 text-right bg-green-200 print:px-1">
                      {data.totaluri.total.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="mt-4 text-xs text-gray-500 print:mt-2">
          <p className="font-medium mb-1">Legendă categorii:</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {data.categoriiCheltuieli.map(cat => (
              <span key={cat}>
                <strong>{getCategoryShortCode(cat)}</strong> = {cat}
              </span>
            ))}
          </div>
        </div>

        {/* Print footer */}
        <div className="hidden print:block mt-4 pt-2 border-t text-xs text-gray-500">
          <p>Generat de BlocHub la {new Date().toLocaleDateString('ro-RO')}</p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A3 landscape;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
