import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import * as XLSX from 'xlsx'

const tipCheltuialaLabels: Record<string, string> = {
  APA_RECE: 'Apă rece',
  APA_CALDA: 'Apă caldă',
  CANALIZARE: 'Canalizare',
  GAZ: 'Gaz',
  CURENT_COMUN: 'Curent comun',
  CALDURA: 'Căldură',
  ASCENSOR: 'Ascensor',
  CURATENIE: 'Curățenie',
  GUNOI: 'Gunoi',
  FOND_RULMENT: 'Fond rulment',
  FOND_REPARATII: 'Fond reparații',
  ADMINISTRARE: 'Administrare',
  ALTE_CHELTUIELI: 'Alte cheltuieli',
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const { searchParams } = new URL(request.url)
    const luna = parseInt(searchParams.get('luna') || String(new Date().getMonth() + 1))
    const an = parseInt(searchParams.get('an') || String(new Date().getFullYear()))
    const format = searchParams.get('format') || 'xlsx' // xlsx, csv, json

    // Get user's asociatie
    const asociatie = await db.asociatie.findFirst({
      where: { adminId: userId },
      include: { fonduri: true },
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație not found' }, { status: 404 })
    }

    // Get avizier data
    const avizierData = await getAvizierData(asociatie, luna, an)

    if (format === 'json') {
      return NextResponse.json(avizierData)
    }

    if (format === 'csv') {
      const csv = generateCSV(avizierData, asociatie, luna, an)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="avizier-${asociatie.nume}-${luna}-${an}.csv"`,
        },
      })
    }

    // Default: Excel
    const buffer = generateExcel(avizierData, asociatie, luna, an)
    return new Response(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="avizier-${asociatie.nume}-${luna}-${an}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Avizier export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}

async function getAvizierData(asociatie: any, luna: number, an: number) {
  // Get apartments
  const apartamente = await db.apartament.findMany({
    where: { asociatieId: asociatie.id },
    include: {
      scara: true,
      proprietari: {
        where: { esteActiv: true },
        include: { user: { select: { name: true, email: true } } },
      },
    },
    orderBy: [{ scara: { numar: 'asc' } }, { numar: 'asc' }],
  })

  // Get expenses for this month
  const cheltuieli = await db.cheltuiala.findMany({
    where: { asociatieId: asociatie.id, luna, an },
  })

  // Calculate totals
  const totalCotaIndiviza = apartamente.reduce((sum, apt) => sum + (apt.cotaIndiviza || 0), 0)
  const totalPersons = apartamente.reduce((sum, apt) => sum + apt.nrPersoane, 0)

  // Get expense categories
  const categorii = [...new Set(cheltuieli.map(ch => tipCheltuialaLabels[ch.tip] || ch.tip))]

  // Get previous months expenses for restanțe
  const previousMonthsExpenses = await db.cheltuiala.findMany({
    where: {
      asociatieId: asociatie.id,
      OR: [{ an: { lt: an } }, { an, luna: { lt: luna } }],
    },
  })

  // Get all confirmed payments with chitanță info
  const allPayments = await db.plata.findMany({
    where: {
      apartament: { asociatieId: asociatie.id },
      status: 'CONFIRMED',
    },
    include: {
      apartament: { select: { id: true } },
      chitanta: { select: { luna: true, an: true } },
    },
  })

  // Group payments by apartment (only previous months)
  const paymentsByApartment: Record<string, number> = {}
  allPayments.forEach(plata => {
    const isPreviousMonth = plata.chitanta.an < an ||
      (plata.chitanta.an === an && plata.chitanta.luna < luna)
    if (isPreviousMonth) {
      paymentsByApartment[plata.apartament.id] =
        (paymentsByApartment[plata.apartament.id] || 0) + plata.suma
    }
  })

  // Calculate previous owed per apartment
  const previousOwedByApartment: Record<string, number> = {}
  previousMonthsExpenses.forEach(ch => {
    apartamente.forEach(apt => {
      let sumaApt = 0
      if (ch.modRepartizare === 'COTA_INDIVIZA' && totalCotaIndiviza > 0) {
        sumaApt = (ch.suma * (apt.cotaIndiviza || 0)) / totalCotaIndiviza
      } else if (ch.modRepartizare === 'PERSOANE' && totalPersons > 0) {
        sumaApt = (ch.suma * apt.nrPersoane) / totalPersons
      } else if (ch.modRepartizare === 'APARTAMENT' && apartamente.length > 0) {
        sumaApt = ch.suma / apartamente.length
      }
      previousOwedByApartment[apt.id] = (previousOwedByApartment[apt.id] || 0) + sumaApt
    })
  })

  // Add previous months' funds
  const previousMonthsSet = new Set<string>()
  previousMonthsExpenses.forEach(ch => previousMonthsSet.add(`${ch.an}-${ch.luna}`))
  const monthlyFunds = asociatie.fonduri.reduce((sum: number, fond: any) => sum + fond.sumaLunara, 0)
  apartamente.forEach(apt => {
    previousOwedByApartment[apt.id] =
      (previousOwedByApartment[apt.id] || 0) + (monthlyFunds * previousMonthsSet.size)
  })

  // Calculate restanțe
  const restantaByApartment: Record<string, number> = {}
  apartamente.forEach(apt => {
    const totalOwed = previousOwedByApartment[apt.id] || 0
    const totalPaid = paymentsByApartment[apt.id] || 0
    restantaByApartment[apt.id] = Math.max(0, totalOwed - totalPaid)
  })

  // Calculate penalties
  const penalizariByApartment: Record<string, number> = {}
  const currentDate = new Date()
  const expensesByMonth: Record<string, typeof previousMonthsExpenses> = {}
  previousMonthsExpenses.forEach(ch => {
    const key = `${ch.an}-${ch.luna}`
    if (!expensesByMonth[key]) expensesByMonth[key] = []
    expensesByMonth[key].push(ch)
  })

  apartamente.forEach(apt => {
    let penalizareTotal = 0
    if (restantaByApartment[apt.id] > 0) {
      const paymentsByMonth: Record<string, number> = {}
      allPayments
        .filter(p => p.apartament.id === apt.id && p.status === 'CONFIRMED')
        .forEach(plata => {
          const key = `${plata.chitanta.an}-${plata.chitanta.luna}`
          paymentsByMonth[key] = (paymentsByMonth[key] || 0) + plata.suma
        })

      Object.entries(expensesByMonth).forEach(([monthKey, expenses]) => {
        const [yearStr, lunaStr] = monthKey.split('-')
        const expenseYear = parseInt(yearStr)
        const expenseLuna = parseInt(lunaStr)

        let monthlyOwed = 0
        expenses.forEach(ch => {
          let sumaApt = 0
          if (ch.modRepartizare === 'COTA_INDIVIZA' && totalCotaIndiviza > 0) {
            sumaApt = (ch.suma * (apt.cotaIndiviza || 0)) / totalCotaIndiviza
          } else if (ch.modRepartizare === 'PERSOANE' && totalPersons > 0) {
            sumaApt = (ch.suma * apt.nrPersoane) / totalPersons
          } else if (ch.modRepartizare === 'APARTAMENT' && apartamente.length > 0) {
            sumaApt = ch.suma / apartamente.length
          }
          monthlyOwed += sumaApt
        })
        monthlyOwed += monthlyFunds

        const monthlyPaid = paymentsByMonth[monthKey] || 0
        const monthlyUnpaid = Math.max(0, monthlyOwed - monthlyPaid)

        if (monthlyUnpaid > 0) {
          const dueDate = new Date(expenseYear, expenseLuna - 1, asociatie.ziScadenta)
          if (currentDate > dueDate) {
            const daysLate = Math.floor((currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
            penalizareTotal += monthlyUnpaid * (asociatie.penalizareZi / 100) * daysLate
          }
        }
      })
    }
    penalizariByApartment[apt.id] = Math.round(penalizareTotal * 100) / 100
  })

  // Build final data
  const rows = apartamente.map(apt => {
    const cheltuieliApt: Record<string, number> = {}
    let totalIntretinere = 0

    cheltuieli.forEach(ch => {
      const tipLabel = tipCheltuialaLabels[ch.tip] || ch.tip
      let sumaApt = 0
      if (ch.modRepartizare === 'COTA_INDIVIZA' && totalCotaIndiviza > 0) {
        sumaApt = (ch.suma * (apt.cotaIndiviza || 0)) / totalCotaIndiviza
      } else if (ch.modRepartizare === 'PERSOANE' && totalPersons > 0) {
        sumaApt = (ch.suma * apt.nrPersoane) / totalPersons
      } else if (ch.modRepartizare === 'APARTAMENT' && apartamente.length > 0) {
        sumaApt = ch.suma / apartamente.length
      }
      cheltuieliApt[tipLabel] = (cheltuieliApt[tipLabel] || 0) + sumaApt
      totalIntretinere += sumaApt
    })

    const fonduri = monthlyFunds
    const restanta = restantaByApartment[apt.id] || 0
    const penalizari = penalizariByApartment[apt.id] || 0
    const total = totalIntretinere + fonduri + restanta + penalizari

    return {
      scara: apt.scara?.numar || '',
      apartament: apt.numar,
      proprietar: apt.proprietari[0]?.user?.name || apt.proprietari[0]?.user?.email?.split('@')[0] || '',
      persoane: apt.nrPersoane,
      cota: apt.cotaIndiviza || 0,
      ...cheltuieliApt,
      intretinere: Math.round(totalIntretinere * 100) / 100,
      fonduri: Math.round(fonduri * 100) / 100,
      restanta: Math.round(restanta * 100) / 100,
      penalizari: Math.round(penalizari * 100) / 100,
      total: Math.round(total * 100) / 100,
    }
  })

  return { categorii, rows }
}

function generateCSV(data: any, asociatie: any, luna: number, an: number): string {
  const lunaName = ['', 'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'][luna]

  let csv = ''
  csv += `# AVIZIER ${asociatie.nume}\n`
  csv += `# ${lunaName} ${an}\n`
  csv += `# Adresa: ${asociatie.adresa}, ${asociatie.oras}\n\n`

  // Headers
  const headers = ['Scara', 'Apt', 'Proprietar', 'Pers', 'Cotă %', ...data.categorii, 'Întreținere', 'Fonduri', 'Restanță', 'Penalizări', 'TOTAL']
  csv += headers.join(',') + '\n'

  // Data rows
  for (const row of data.rows) {
    const values = [
      row.scara,
      row.apartament,
      `"${row.proprietar}"`,
      row.persoane,
      row.cota,
      ...data.categorii.map((cat: string) => row[cat] || 0),
      row.intretinere,
      row.fonduri,
      row.restanta,
      row.penalizari,
      row.total,
    ]
    csv += values.join(',') + '\n'
  }

  // Totals
  const totals = {
    intretinere: data.rows.reduce((sum: number, r: any) => sum + r.intretinere, 0),
    fonduri: data.rows.reduce((sum: number, r: any) => sum + r.fonduri, 0),
    restanta: data.rows.reduce((sum: number, r: any) => sum + r.restanta, 0),
    penalizari: data.rows.reduce((sum: number, r: any) => sum + r.penalizari, 0),
    total: data.rows.reduce((sum: number, r: any) => sum + r.total, 0),
  }
  csv += `\nTOTAL,,,,,${data.categorii.map(() => '').join(',')},${totals.intretinere},${totals.fonduri},${totals.restanta},${totals.penalizari},${totals.total}\n`

  return csv
}

function generateExcel(data: any, asociatie: any, luna: number, an: number): Uint8Array {
  const lunaName = ['', 'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'][luna]

  const wb = XLSX.utils.book_new()

  // Create header rows
  const wsData: any[][] = [
    [`AVIZIER - ${asociatie.nume}`],
    [`${lunaName} ${an}`],
    [`Adresa: ${asociatie.adresa}, ${asociatie.oras}`],
    [],
    ['Scara', 'Apt', 'Proprietar', 'Pers', 'Cotă %', ...data.categorii, 'Întreținere', 'Fonduri', 'Restanță', 'Penalizări', 'TOTAL'],
  ]

  // Data rows
  for (const row of data.rows) {
    wsData.push([
      row.scara,
      row.apartament,
      row.proprietar,
      row.persoane,
      row.cota,
      ...data.categorii.map((cat: string) => row[cat] || 0),
      row.intretinere,
      row.fonduri,
      row.restanta,
      row.penalizari,
      row.total,
    ])
  }

  // Totals row
  const totals = {
    intretinere: data.rows.reduce((sum: number, r: any) => sum + r.intretinere, 0),
    fonduri: data.rows.reduce((sum: number, r: any) => sum + r.fonduri, 0),
    restanta: data.rows.reduce((sum: number, r: any) => sum + r.restanta, 0),
    penalizari: data.rows.reduce((sum: number, r: any) => sum + r.penalizari, 0),
    total: data.rows.reduce((sum: number, r: any) => sum + r.total, 0),
  }

  wsData.push([])
  wsData.push([
    'TOTAL', '', '', '', '',
    ...data.categorii.map(() => ''),
    Math.round(totals.intretinere * 100) / 100,
    Math.round(totals.fonduri * 100) / 100,
    Math.round(totals.restanta * 100) / 100,
    Math.round(totals.penalizari * 100) / 100,
    Math.round(totals.total * 100) / 100,
  ])

  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Set column widths
  ws['!cols'] = [
    { wch: 6 }, // Scara
    { wch: 6 }, // Apt
    { wch: 20 }, // Proprietar
    { wch: 5 }, // Pers
    { wch: 7 }, // Cota
    ...data.categorii.map(() => ({ wch: 12 })),
    { wch: 12 }, // Întreținere
    { wch: 10 }, // Fonduri
    { wch: 10 }, // Restanță
    { wch: 10 }, // Penalizări
    { wch: 12 }, // TOTAL
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Avizier')

  // Generate buffer
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return new Uint8Array(buffer)
}
