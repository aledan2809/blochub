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

    // Get user's apartament to find their asociatie
    const proprietar = await db.proprietarApartament.findFirst({
      where: { userId, esteActiv: true },
      include: {
        apartament: {
          include: { asociatie: true },
        },
      },
    })

    if (!proprietar) {
      return NextResponse.json(null)
    }

    const asociatie = proprietar.apartament.asociatie

    // Get all apartments with their chitante for this month
    const apartamente = await db.apartament.findMany({
      where: { asociatieId: asociatie.id },
      include: {
        scara: true,
        proprietari: {
          where: { esteActiv: true },
          include: {
            user: {
              select: { name: true },
            },
          },
        },
        chitante: {
          where: { luna, an },
          include: {
            repartizari: {
              include: {
                cheltuiala: true,
              },
            },
          },
        },
      },
      orderBy: [
        { scara: { numar: 'asc' } },
        { numar: 'asc' },
      ],
    })

    // Get all expense types used this month
    const cheltuieli = await db.cheltuiala.findMany({
      where: { asociatieId: asociatie.id, luna, an },
      select: { tip: true },
      distinct: ['tip'],
    })

    const categoriiCheltuieli = cheltuieli.map(c => tipCheltuialaLabels[c.tip] || c.tip)

    // Build avizier data
    const totaluriCategorii: Record<string, number> = {}
    let totalIntretinere = 0
    let totalRestante = 0
    let totalPenalizari = 0
    let totalFonduri = 0
    let totalGeneral = 0

    const apartamenteData = apartamente.map(apt => {
      const chitanta = apt.chitante[0]
      const cheltuieliApt: Record<string, number> = {}

      // Calculate expenses per category from repartizari
      if (chitanta?.repartizari) {
        for (const rep of chitanta.repartizari) {
          const tipLabel = tipCheltuialaLabels[rep.cheltuiala.tip] || rep.cheltuiala.tip
          cheltuieliApt[tipLabel] = (cheltuieliApt[tipLabel] || 0) + rep.suma
          totaluriCategorii[tipLabel] = (totaluriCategorii[tipLabel] || 0) + rep.suma
        }
      }

      const intretinere = chitanta?.sumaIntretinere || 0
      const restanta = chitanta?.sumaRestanta || 0
      const penalizari = chitanta?.sumaPenalizare || 0
      const fonduri = chitanta?.sumaFonduri || 0
      const total = chitanta?.sumaTotal || 0

      totalIntretinere += intretinere
      totalRestante += restanta
      totalPenalizari += penalizari
      totalFonduri += fonduri
      totalGeneral += total

      const proprietarNume = apt.proprietari[0]?.user?.name?.split(' ')[0] || ''

      return {
        numar: apt.numar,
        scara: apt.scara?.numar,
        proprietar: proprietarNume,
        cheltuieli: cheltuieliApt,
        totalIntretinere: intretinere,
        restanta,
        penalizari,
        fonduri,
        total,
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
        penalizari: totalPenalizari,
        fonduri: totalFonduri,
        total: totalGeneral,
      },
    })
  } catch (error) {
    console.error('Error fetching portal avizier:', error)
    return NextResponse.json(
      { error: 'Failed to fetch avizier' },
      { status: 500 }
    )
  }
}
