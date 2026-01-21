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
            sumaTotal: true
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

    // Verify chitanta belongs to user's association
    const chitanta = await db.chitanta.findFirst({
      where: { id: body.chitantaId },
      include: {
        asociatie: true,
        apartament: true
      }
    })

    if (!chitanta || chitanta.asociatie.adminId !== userId) {
      return NextResponse.json({ error: 'Chitanță negăsită' }, { status: 404 })
    }

    // Create payment
    const plata = await db.plata.create({
      data: {
        suma: body.suma,
        metodaPlata: body.metodaPlata || 'CASH',
        status: 'CONFIRMED',
        referinta: body.referinta || null,
        chitantaId: body.chitantaId,
        apartamentId: chitanta.apartamentId,
        dataPlata: body.dataPlata ? new Date(body.dataPlata) : new Date()
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
        chitantaId: body.chitantaId,
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
        where: { id: body.chitantaId },
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
