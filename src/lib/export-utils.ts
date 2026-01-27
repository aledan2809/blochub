import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

// Export apartments to Excel
export function exportApartamenteToExcel(apartamente: any[], asociatie: any) {
  const data = apartamente.map(apt => ({
    'Număr': apt.numar,
    'Scară': apt.scara?.numar || 'N/A',
    'Etaj': apt.etaj || 'N/A',
    'Camere': apt.nrCamere || 'N/A',
    'Suprafață (mp)': apt.suprafata || 'N/A',
    'Cota Indiviză': apt.cotaIndiviza || 'N/A',
    'Persoane': apt.nrPersoane || 0,
    'Proprietar': apt.proprietari?.[0]?.user.name || 'Fără proprietar',
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Apartamente')

  const fileName = `${asociatie?.nume || 'Apartamente'}_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, fileName)
}

// Export apartments to PDF
export function exportApartamenteToPDF(apartamente: any[], asociatie: any) {
  const doc = new jsPDF()

  // Add title
  doc.setFontSize(16)
  doc.text(`Listă Apartamente - ${asociatie?.nume || 'Asociație'}`, 14, 15)

  // Add date
  doc.setFontSize(10)
  doc.text(`Data: ${new Date().toLocaleDateString('ro-RO')}`, 14, 22)

  // Prepare table data
  const tableData = apartamente.map(apt => [
    apt.numar,
    apt.scara?.numar || 'N/A',
    apt.etaj?.toString() || 'N/A',
    apt.nrCamere?.toString() || 'N/A',
    apt.suprafata?.toString() || 'N/A',
    apt.cotaIndiviza?.toString() || 'N/A',
    apt.nrPersoane?.toString() || '0',
    apt.proprietari?.[0]?.user.name || 'Fără proprietar',
  ])

  // Add table
  autoTable(doc, {
    head: [['Număr', 'Scară', 'Etaj', 'Camere', 'Suprafață', 'Cota', 'Persoane', 'Proprietar']],
    body: tableData,
    startY: 28,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246] },
  })

  const fileName = `${asociatie?.nume || 'Apartamente'}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

// Export financial report to Excel
export function exportFinancialReportToExcel(data: {
  asociatie: any
  apartamente: any[]
  fonduri: any[]
  totalRestante?: number
}) {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Apartamente cu restanțe
  const aptData = data.apartamente.map(apt => ({
    'Apartament': apt.numar,
    'Scară': apt.scara?.numar || 'N/A',
    'Proprietar': apt.proprietari?.[0]?.user.name || 'N/A',
    'Email': apt.proprietari?.[0]?.user.email || 'N/A',
    'Persoane': apt.nrPersoane,
    'Cota Indiviză': apt.cotaIndiviza || 'N/A',
  }))
  const ws1 = XLSX.utils.json_to_sheet(aptData)
  XLSX.utils.book_append_sheet(wb, ws1, 'Apartamente')

  // Sheet 2: Fonduri
  const fonduriData = data.fonduri.map(fond => ({
    'Denumire': fond.denumire,
    'Tip': fond.tip,
    'Sumă Lunară': fond.sumaLunara,
    'Sold Curent': fond.soldCurent,
  }))
  const ws2 = XLSX.utils.json_to_sheet(fonduriData)
  XLSX.utils.book_append_sheet(wb, ws2, 'Fonduri')

  // Sheet 3: Rezumat
  const rezumat = [
    { 'Indicator': 'Total Apartamente', 'Valoare': data.apartamente.length },
    { 'Indicator': 'Total Fonduri', 'Valoare': data.fonduri.length },
    { 'Indicator': 'Sold Total Fonduri', 'Valoare': data.fonduri.reduce((sum, f) => sum + f.soldCurent, 0) },
  ]
  if (data.totalRestante !== undefined) {
    rezumat.push({ 'Indicator': 'Total Restanțe', 'Valoare': data.totalRestante })
  }
  const ws3 = XLSX.utils.json_to_sheet(rezumat)
  XLSX.utils.book_append_sheet(wb, ws3, 'Rezumat')

  const fileName = `Raport_Financiar_${data.asociatie?.nume || 'Asociatie'}_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, fileName)
}

// Export financial report to PDF
export function exportFinancialReportToPDF(data: {
  asociatie: any
  apartamente: any[]
  fonduri: any[]
  totalRestante?: number
}) {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(18)
  doc.text(`Raport Financiar`, 14, 20)
  doc.setFontSize(14)
  doc.text(`${data.asociatie?.nume || 'Asociație'}`, 14, 28)

  // Date
  doc.setFontSize(10)
  doc.text(`Data generării: ${new Date().toLocaleDateString('ro-RO')}`, 14, 35)

  let yPos = 45

  // Summary section
  doc.setFontSize(12)
  doc.text('Rezumat', 14, yPos)
  yPos += 8

  doc.setFontSize(10)
  doc.text(`Total Apartamente: ${data.apartamente.length}`, 20, yPos)
  yPos += 6
  doc.text(`Total Fonduri: ${data.fonduri.length}`, 20, yPos)
  yPos += 6

  const totalSold = data.fonduri.reduce((sum, f) => sum + f.soldCurent, 0)
  doc.text(`Sold Total Fonduri: ${totalSold.toFixed(2)} RON`, 20, yPos)
  yPos += 6

  if (data.totalRestante !== undefined) {
    doc.text(`Total Restanțe: ${data.totalRestante.toFixed(2)} RON`, 20, yPos)
    yPos += 10
  } else {
    yPos += 6
  }

  // Fonduri table
  doc.setFontSize(12)
  doc.text('Fonduri', 14, yPos)
  yPos += 5

  const fonduriData = data.fonduri.map(f => [
    f.denumire,
    f.tip,
    f.sumaLunara.toFixed(2),
    f.soldCurent.toFixed(2),
  ])

  autoTable(doc, {
    head: [['Denumire', 'Tip', 'Sumă Lunară', 'Sold Curent']],
    body: fonduriData,
    startY: yPos,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246] },
  })

  const fileName = `Raport_Financiar_${data.asociatie?.nume || 'Asociatie'}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

// Export proprietari/chiriași to Excel
export function exportProprietariToExcel(proprietari: any[], asociatie: any) {
  const data = proprietari.map(prop => ({
    'Nume': prop.user.name || 'N/A',
    'Email': prop.user.email,
    'Telefon': prop.user.telefon || 'N/A',
    'Apartamente': prop.apartamente?.map((a: any) => a.apartament.numar).join(', ') || 'N/A',
    'Tip': prop.tipProprietar === 'PROPRIETAR' ? 'Proprietar' : 'Chiriaș',
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Proprietari')

  const fileName = `Proprietari_${asociatie?.nume || 'Asociatie'}_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, fileName)
}
