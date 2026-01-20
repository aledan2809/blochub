import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as any).id

    const proprietarApartamente = await db.proprietarApartament.findMany({
      where: {
        userId,
        esteActiv: true,
      },
      select: {
        apartamentId: true,
      },
    })

    const apartamentIds = proprietarApartamente.map(pa => pa.apartamentId)

    if (apartamentIds.length === 0) {
      return NextResponse.json([])
    }

    const chitante = await db.chitanta.findMany({
      where: {
        apartamentId: { in: apartamentIds },
      },
      include: {
        apartament: {
          select: {
            numar: true,
          },
        },
        asociatie: {
          select: {
            nume: true,
          },
        },
        plati: {
          where: {
            status: 'CONFIRMED',
          },
          select: {
            suma: true,
          },
        },
      },
      orderBy: [
        { an: 'desc' },
        { luna: 'desc' },
      ],
    })

    const chitanteWithRamasa = chitante.map(chitanta => {
      const sumaPlatita = chitanta.plati.reduce((acc, p) => acc + p.suma, 0)
      return {
        id: chitanta.id,
        numar: chitanta.numar,
        luna: chitanta.luna,
        an: chitanta.an,
        sumaIntretinere: chitanta.sumaIntretinere,
        sumaRestanta: chitanta.sumaRestanta,
        sumaPenalizare: chitanta.sumaPenalizare,
        sumaFonduri: chitanta.sumaFonduri,
        sumaTotal: chitanta.sumaTotal,
        sumaRamasa: chitanta.sumaTotal - sumaPlatita,
        status: chitanta.status,
        dataEmitere: chitanta.dataEmitere.toISOString(),
        dataScadenta: chitanta.dataScadenta.toISOString(),
        apartament: chitanta.apartament.numar,
        asociatie: chitanta.asociatie.nume,
      }
    })

    return NextResponse.json(chitanteWithRamasa)
  } catch (error) {
    console.error('Error fetching chitante:', error)
    return NextResponse.json(
      { error: 'Eroare la încărcarea chitanțelor' },
      { status: 500 }
    )
  }
}
