import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET unpaid expenses for an association
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const { searchParams } = new URL(request.url)
    const asociatieId = searchParams.get('asociatieId')
    const showPaid = searchParams.get('showPaid') === 'true'

    if (!asociatieId) {
      return NextResponse.json({ error: 'asociatieId required' }, { status: 400 })
    }

    // Verify user owns the association
    const asociatie = await db.asociatie.findFirst({
      where: { id: asociatieId, adminId: userId }
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    const where: Record<string, unknown> = { asociatieId }
    if (!showPaid) {
      where.platita = false
    }

    const cheltuieli = await db.cheltuiala.findMany({
      where,
      include: {
        furnizor: { select: { id: true, nume: true } }
      },
      orderBy: [
        { platita: 'asc' },
        { dataScadenta: 'asc' },
        { dataFactura: 'desc' }
      ]
    })

    // Calculate stats
    const unpaidTotal = cheltuieli
      .filter(c => !c.platita)
      .reduce((sum, c) => sum + c.suma, 0)

    const paidTotal = cheltuieli
      .filter(c => c.platita)
      .reduce((sum, c) => sum + c.suma, 0)

    return NextResponse.json({
      cheltuieli,
      stats: {
        unpaidCount: cheltuieli.filter(c => !c.platita).length,
        unpaidTotal,
        paidCount: cheltuieli.filter(c => c.platita).length,
        paidTotal
      }
    })
  } catch (error) {
    console.error('GET plati-furnizori error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// POST - mark expense as paid
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const body = await request.json()

    const { cheltuialaId, metodaPlata, referinta, dataPlata } = body

    if (!cheltuialaId) {
      return NextResponse.json({ error: 'cheltuialaId required' }, { status: 400 })
    }

    // Find the expense and verify ownership
    const cheltuiala = await db.cheltuiala.findUnique({
      where: { id: cheltuialaId },
      include: { asociatie: true }
    })

    if (!cheltuiala) {
      return NextResponse.json({ error: 'Cheltuială negăsită' }, { status: 404 })
    }

    if (cheltuiala.asociatie.adminId !== userId) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 403 })
    }

    // Mark as paid
    const updated = await db.cheltuiala.update({
      where: { id: cheltuialaId },
      data: {
        platita: true,
        dataPlata: dataPlata ? new Date(dataPlata) : new Date(),
        metodaPlataFurnizor: metodaPlata || 'TRANSFER',
        referintaPlata: referinta || null
      },
      include: {
        furnizor: { select: { id: true, nume: true } }
      }
    })

    return NextResponse.json({ cheltuiala: updated })
  } catch (error) {
    console.error('POST plati-furnizori error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// DELETE - mark expense as unpaid (revert payment)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const { searchParams } = new URL(request.url)
    const cheltuialaId = searchParams.get('id')

    if (!cheltuialaId) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    // Find the expense and verify ownership
    const cheltuiala = await db.cheltuiala.findUnique({
      where: { id: cheltuialaId },
      include: { asociatie: true }
    })

    if (!cheltuiala) {
      return NextResponse.json({ error: 'Cheltuială negăsită' }, { status: 404 })
    }

    if (cheltuiala.asociatie.adminId !== userId) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 403 })
    }

    // Mark as unpaid
    const updated = await db.cheltuiala.update({
      where: { id: cheltuialaId },
      data: {
        platita: false,
        dataPlata: null,
        metodaPlataFurnizor: null,
        referintaPlata: null
      }
    })

    return NextResponse.json({ success: true, cheltuiala: updated })
  } catch (error) {
    console.error('DELETE plati-furnizori error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
