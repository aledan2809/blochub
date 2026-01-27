import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

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

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const { searchParams } = new URL(request.url)
    const luna = parseInt(searchParams.get('luna') || String(new Date().getMonth() + 1))
    const an = parseInt(searchParams.get('an') || String(new Date().getFullYear()))

    // Get user's asociatie
    const asociatie = await db.asociatie.findFirst({
      where: { adminId: userId },
      include: {
        fonduri: true,
      },
    })

    if (!asociatie) {
      return NextResponse.json(null)
    }

    // Get all apartments
    const apartamente = await db.apartament.findMany({
      where: { asociatieId: asociatie.id },
      include: {
        scara: true,
        proprietari: {
          where: { esteActiv: true },
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
      orderBy: [
        { scara: { numar: 'asc' } },
        { numar: 'asc' },
      ],
    })

    // Get all expenses for this month
    const cheltuieli = await db.cheltuiala.findMany({
      where: {
        asociatieId: asociatie.id,
        luna,
        an,
      },
    })

    // Get expense categories
    const categoriiSet = new Set<string>()
    cheltuieli.forEach(ch => categoriiSet.add(tipCheltuialaLabels[ch.tip] || ch.tip))
    const categoriiCheltuieli = Array.from(categoriiSet)

    // Calculate total cota indiviza and total persons for distribution
    const totalCotaIndiviza = apartamente.reduce((sum, apt) => sum + (apt.cotaIndiviza || 0), 0)
    const totalPersons = apartamente.reduce((sum, apt) => sum + apt.nrPersoane, 0)

    // Group expenses by type
    const cheltuieliByType: Record<string, number> = {}
    cheltuieli.forEach(ch => {
      const tipLabel = tipCheltuialaLabels[ch.tip] || ch.tip
      cheltuieliByType[tipLabel] = (cheltuieliByType[tipLabel] || 0) + ch.suma
    })

    // Build avizier data - calculate distribution for each apartment
    const totaluriCategorii: Record<string, number> = {}
    let totalIntretinere = 0
    let totalFonduri = 0
    let totalGeneral = 0

    // Calculate outstanding balances for all previous months
    const previousMonthsExpenses = await db.cheltuiala.findMany({
      where: {
        asociatieId: asociatie.id,
        OR: [
          { an: { lt: an } },
          { an, luna: { lt: luna } }
        ]
      },
    })

    // Calculate all confirmed payments
    const allPayments = await db.plata.findMany({
      where: {
        apartament: { asociatieId: asociatie.id },
        status: 'CONFIRMED',
      },
      include: {
        apartament: { select: { id: true } }
      }
    })

    // Group payments by apartment
    const paymentsByApartment: Record<string, number> = {}
    allPayments.forEach(plata => {
      paymentsByApartment[plata.apartament.id] =
        (paymentsByApartment[plata.apartament.id] || 0) + plata.suma
    })

    // Calculate total owed per apartment from previous months
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
        } else if (ch.modRepartizare === 'MANUAL' || ch.modRepartizare === 'CONSUM') {
          sumaApt = 0
        } else {
          sumaApt = totalCotaIndiviza > 0 ? (ch.suma * (apt.cotaIndiviza || 0)) / totalCotaIndiviza : 0
        }
        previousOwedByApartment[apt.id] = (previousOwedByApartment[apt.id] || 0) + sumaApt
      })
    })

    // Add previous months' funds - count unique months
    const previousMonthsSet = new Set<string>()
    previousMonthsExpenses.forEach(ch => {
      previousMonthsSet.add(`${ch.an}-${ch.luna}`)
    })
    const monthlyFunds = asociatie.fonduri.reduce((sum, fond) => sum + fond.sumaLunara, 0)
    apartamente.forEach(apt => {
      previousOwedByApartment[apt.id] =
        (previousOwedByApartment[apt.id] || 0) + (monthlyFunds * previousMonthsSet.size)
    })

    // Calculate outstanding balance (restanță)
    const restantaByApartment: Record<string, number> = {}
    apartamente.forEach(apt => {
      const totalOwed = previousOwedByApartment[apt.id] || 0
      const totalPaid = paymentsByApartment[apt.id] || 0
      restantaByApartment[apt.id] = Math.max(0, totalOwed - totalPaid)
    })

    let totalRestante = 0

    const apartamenteData = apartamente.map(apt => {
      const cheltuieliApt: Record<string, number> = {}
      let totalAptCurent = 0

      // Distribute each expense category for current month
      cheltuieli.forEach(ch => {
        const tipLabel = tipCheltuialaLabels[ch.tip] || ch.tip
        let sumaApt = 0

        // Distribution logic based on expense type
        if (ch.modRepartizare === 'COTA_INDIVIZA' && totalCotaIndiviza > 0) {
          // By cota indiviza
          sumaApt = (ch.suma * (apt.cotaIndiviza || 0)) / totalCotaIndiviza
        } else if (ch.modRepartizare === 'PERSOANE' && totalPersons > 0) {
          // By number of persons
          sumaApt = (ch.suma * apt.nrPersoane) / totalPersons
        } else if (ch.modRepartizare === 'APARTAMENT' && apartamente.length > 0) {
          // Equal distribution per apartment
          sumaApt = ch.suma / apartamente.length
        } else if (ch.modRepartizare === 'MANUAL' || ch.modRepartizare === 'CONSUM') {
          // Manual or consumption-based - skip for now (would need repartizari/indexes)
          sumaApt = 0
        } else {
          // Default: cota indiviza
          sumaApt = totalCotaIndiviza > 0 ? (ch.suma * (apt.cotaIndiviza || 0)) / totalCotaIndiviza : 0
        }

        cheltuieliApt[tipLabel] = (cheltuieliApt[tipLabel] || 0) + sumaApt
        totaluriCategorii[tipLabel] = (totaluriCategorii[tipLabel] || 0) + sumaApt
        totalAptCurent += sumaApt
      })

      // Add monthly funds for current month
      const fonduriApt = asociatie.fonduri.reduce((sum, fond) => sum + fond.sumaLunara, 0)
      totalAptCurent += fonduriApt
      totalFonduri += fonduriApt

      // Get outstanding balance (restanță from previous months)
      const restanta = restantaByApartment[apt.id] || 0
      totalRestante += restanta

      // Total = current month + outstanding balance
      const totalApt = totalAptCurent + restanta

      totalIntretinere += totalAptCurent - fonduriApt
      totalGeneral += totalApt

      const proprietar = apt.proprietari[0]?.user
      const proprietarNume = proprietar?.name || proprietar?.email?.split('@')[0] || ''

      return {
        numar: apt.numar,
        scara: apt.scara?.numar,
        proprietar: proprietarNume,
        cheltuieli: cheltuieliApt,
        totalIntretinere: totalAptCurent - fonduriApt,
        restanta,
        penalizari: 0, // TODO: Calculate penalties for late payments
        fonduri: fonduriApt,
        total: totalApt,
      }
    })

    return NextResponse.json({
      asociatie: {
        nume: asociatie.nume,
        adresa: `${asociatie.adresa}, ${asociatie.oras}`,
      },
      luna,
      an,
      categoriiCheltuieli,
      apartamente: apartamenteData,
      totaluri: {
        categorii: totaluriCategorii,
        intretinere: totalIntretinere,
        restante: totalRestante,
        penalizari: 0,
        fonduri: totalFonduri,
        total: totalGeneral,
      },
      hasExpenses: cheltuieli.length > 0,
    })
  } catch (error) {
    console.error('Error fetching avizier:', error)
    return NextResponse.json(
      { error: 'Failed to fetch avizier' },
      { status: 500 }
    )
  }
}
