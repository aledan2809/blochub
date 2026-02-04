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

    const userId = (session.user as { id: string }).id

    const { searchParams } = new URL(request.url)
    const asociatieId = searchParams.get('asociatieId')
    const luna = searchParams.get('luna')
    const an = searchParams.get('an')

    // Get user's association if not provided
    let association
    if (asociatieId) {
      association = await db.asociatie.findFirst({
        where: { id: asociatieId, adminId: userId }
      })
    } else {
      association = await db.asociatie.findFirst({
        where: { adminId: userId }
      })
    }

    if (!association) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    const where: Record<string, unknown> = {
      apartament: { asociatieId: association.id }
    }

    // Filter by month/year if provided
    if (luna && an) {
      const startDate = new Date(parseInt(an), parseInt(luna) - 1, 1)
      const endDate = new Date(parseInt(an), parseInt(luna), 0, 23, 59, 59)
      where.dataPlata = {
        gte: startDate,
        lte: endDate
      }
    }

    const plati = await db.plata.findMany({
      where,
      include: {
        apartament: {
          select: {
            numar: true,
            scara: { select: { numar: true } }
          }
        },
        chitanta: {
          select: {
            numar: true,
            luna: true,
            an: true,
            sumaIntretinere: true,
            sumaRestanta: true,
            sumaPenalizare: true,
            sumaFonduri: true,
            sumaTotal: true,
            plati: {
              where: { status: 'CONFIRMED' },
              select: { suma: true }
            }
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { dataPlata: 'desc' }
    })

    // Get receipt book settings
    const asociatieData = {
      id: association.id,
      serieChitantier: association.serieChitantier,
      numarChitantierStart: association.numarChitantierStart,
      ultimulNumarChitanta: association.ultimulNumarChitanta
    }

    // Get summary stats
    const stats = await db.plata.aggregate({
      where: {
        ...where,
        status: 'CONFIRMED'
      },
      _sum: { suma: true },
      _count: true
    })

    return NextResponse.json({
      plati,
      asociatieId: association.id,
      asociatie: asociatieData,
      stats: {
        totalIncasat: stats._sum.suma || 0,
        numarPlati: stats._count
      }
    })
  } catch (error) {
    console.error('GET incasari error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const body = await request.json()

    const { apartamentId, chitantaId, asociatieId, suma, metodaPlata, referinta, dataPlata } = body

    // Need either apartamentId or chitantaId
    if (!apartamentId && !chitantaId) {
      return NextResponse.json({ error: 'Apartament sau chitanță necesară' }, { status: 400 })
    }

    if (!suma || suma <= 0) {
      return NextResponse.json({ error: 'Suma trebuie să fie mai mare ca 0' }, { status: 400 })
    }

    let chitanta
    let apartament
    let asociatie

    if (chitantaId) {
      // If chitantaId provided, use it directly
      chitanta = await db.chitanta.findFirst({
        where: { id: chitantaId },
        include: {
          asociatie: true,
          apartament: true
        }
      })

      if (!chitanta || chitanta.asociatie.adminId !== userId) {
        return NextResponse.json({ error: 'Chitanță negăsită' }, { status: 404 })
      }

      apartament = chitanta.apartament
      asociatie = chitanta.asociatie
    } else {
      // If only apartamentId, find the oldest unpaid chitanta
      apartament = await db.apartament.findUnique({
        where: { id: apartamentId },
        include: { asociatie: true }
      })

      if (!apartament || apartament.asociatie.adminId !== userId) {
        return NextResponse.json({ error: 'Apartament negăsit' }, { status: 404 })
      }

      asociatie = apartament.asociatie

      // Find oldest unpaid chitanta for this apartment
      chitanta = await db.chitanta.findFirst({
        where: {
          apartamentId,
          status: { in: ['GENERATA', 'TRIMISA', 'PARTIAL_PLATITA', 'RESTANTA'] }
        },
        orderBy: [
          { an: 'asc' },
          { luna: 'asc' }
        ],
        include: { asociatie: true, apartament: true }
      })

      // If no unpaid chitanta exists, try to find any chitanta for this apartment
      if (!chitanta) {
        chitanta = await db.chitanta.findFirst({
          where: { apartamentId },
          orderBy: [
            { an: 'desc' },
            { luna: 'desc' }
          ],
          include: { asociatie: true, apartament: true }
        })
      }

      // If still no chitanta, we can't proceed - user needs to generate obligations first
      if (!chitanta) {
        return NextResponse.json({
          error: 'Nu există obligații de plată pentru acest apartament. Generați obligațiile din Avizier mai întâi.'
        }, { status: 400 })
      }
    }

    // Only generate receipt number for CASH payments
    const isCashPayment = !metodaPlata || metodaPlata === 'CASH'
    let nextReceiptNumber: number | null = null
    let serieChitanta: string | null = null

    if (isCashPayment) {
      // Get next receipt number and update counter atomically
      nextReceiptNumber = (asociatie.ultimulNumarChitanta || 0) + 1
      serieChitanta = asociatie.serieChitantier || null

      // Update the counter
      await db.asociatie.update({
        where: { id: asociatie.id },
        data: { ultimulNumarChitanta: nextReceiptNumber }
      })
    }

    // Create payment (with receipt number only for CASH)
    const plata = await db.plata.create({
      data: {
        suma,
        metodaPlata: metodaPlata || 'CASH',
        status: 'CONFIRMED',
        referinta: referinta || null,
        serieChitantaIncasare: serieChitanta,
        numarChitantaIncasare: nextReceiptNumber,
        chitantaId: chitanta.id,
        apartamentId: apartament.id,
        dataPlata: dataPlata ? new Date(dataPlata) : new Date()
      },
      include: {
        apartament: {
          select: {
            numar: true,
            scara: { select: { numar: true } }
          }
        },
        chitanta: {
          select: {
            numar: true,
            luna: true,
            an: true,
            sumaTotal: true
          }
        }
      }
    })

    // Update chitanta status
    const totalPaid = await db.plata.aggregate({
      where: {
        chitantaId: chitanta.id,
        status: 'CONFIRMED'
      },
      _sum: { suma: true }
    })

    const totalPaidAmount = totalPaid._sum.suma || 0

    let newStatus = chitanta.status
    if (totalPaidAmount >= chitanta.sumaTotal) {
      newStatus = 'PLATITA'
    } else if (totalPaidAmount > 0) {
      newStatus = 'PARTIAL_PLATITA'
    }

    if (newStatus !== chitanta.status) {
      await db.chitanta.update({
        where: { id: chitanta.id },
        data: { status: newStatus }
      })
    }

    return NextResponse.json({ plata }, { status: 201 })
  } catch (error) {
    console.error('POST plata error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID necesar' }, { status: 400 })
    }

    // Verify ownership
    const plata = await db.plata.findUnique({
      where: { id },
      include: {
        chitanta: {
          include: { asociatie: true }
        }
      }
    })

    if (!plata || plata.chitanta.asociatie.adminId !== userId) {
      return NextResponse.json({ error: 'Plată negăsită' }, { status: 404 })
    }

    await db.plata.delete({ where: { id } })

    // Recalculate chitanta status
    const totalPaid = await db.plata.aggregate({
      where: {
        chitantaId: plata.chitantaId,
        status: 'CONFIRMED'
      },
      _sum: { suma: true }
    })

    const totalPaidAmount = totalPaid._sum.suma || 0
    const chitanta = plata.chitanta

    let newStatus: 'GENERATA' | 'PARTIAL_PLATITA' | 'PLATITA' | 'RESTANTA' = 'GENERATA'
    if (totalPaidAmount >= chitanta.sumaTotal) {
      newStatus = 'PLATITA'
    } else if (totalPaidAmount > 0) {
      newStatus = 'PARTIAL_PLATITA'
    } else if (chitanta.dataScadenta < new Date()) {
      newStatus = 'RESTANTA'
    }

    await db.chitanta.update({
      where: { id: plata.chitantaId },
      data: { status: newStatus }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE plata error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
