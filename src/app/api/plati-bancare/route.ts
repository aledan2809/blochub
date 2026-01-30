import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET pending bank payments for an association
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const { searchParams } = new URL(request.url)
    const asociatieId = searchParams.get('asociatieId')
    const status = searchParams.get('status') // PENDING, EXPORTED, PAID, or null for all
    const contBancarId = searchParams.get('contBancarId')

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
    if (status) {
      where.status = status
    }
    if (contBancarId) {
      where.contBancarId = contBancarId
    }

    const plati = await db.plataBancaraPending.findMany({
      where,
      include: {
        contBancar: {
          select: { id: true, nume: true, iban: true, banca: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Group by bank account for stats
    const statsByBank = await db.plataBancaraPending.groupBy({
      by: ['contBancarId', 'status'],
      where: { asociatieId },
      _sum: { suma: true },
      _count: true
    })

    // Get bank accounts with their totals
    const conturi = await db.contBancarAsociatie.findMany({
      where: { asociatieId },
      include: {
        _count: {
          select: { platiPending: true }
        }
      }
    })

    return NextResponse.json({
      plati,
      statsByBank,
      conturi
    })
  } catch (error) {
    console.error('GET plati-bancare error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// POST - add payment to pending bank transfers
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const body = await request.json()

    const {
      asociatieId,
      contBancarId,
      beneficiarNume,
      beneficiarIban,
      beneficiarBanca,
      beneficiarCui,
      suma,
      descriere,
      referinta,
      cheltuialaId
    } = body

    if (!asociatieId || !contBancarId || !beneficiarNume || !beneficiarIban || !suma || !descriere) {
      return NextResponse.json({ error: 'Date incomplete' }, { status: 400 })
    }

    // Verify user owns the association
    const asociatie = await db.asociatie.findFirst({
      where: { id: asociatieId, adminId: userId }
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    // Verify bank account belongs to association
    const contBancar = await db.contBancarAsociatie.findFirst({
      where: { id: contBancarId, asociatieId }
    })

    if (!contBancar) {
      return NextResponse.json({ error: 'Cont bancar negăsit' }, { status: 404 })
    }

    // Create pending payment
    const plata = await db.plataBancaraPending.create({
      data: {
        beneficiarNume,
        beneficiarIban: beneficiarIban.replace(/\s/g, '').toUpperCase(),
        beneficiarBanca: beneficiarBanca || null,
        beneficiarCui: beneficiarCui || null,
        suma,
        descriere,
        referinta: referinta || null,
        cheltuialaId: cheltuialaId || null,
        contBancarId,
        asociatieId,
        status: 'PENDING'
      },
      include: {
        contBancar: {
          select: { id: true, nume: true, iban: true, banca: true }
        }
      }
    })

    return NextResponse.json({ plata })
  } catch (error) {
    console.error('POST plati-bancare error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// PUT - update payment status
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const body = await request.json()

    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'ID și status required' }, { status: 400 })
    }

    // Find and verify ownership
    const existing = await db.plataBancaraPending.findUnique({
      where: { id },
      include: { asociatie: true }
    })

    if (!existing || existing.asociatie.adminId !== userId) {
      return NextResponse.json({ error: 'Plată negăsită' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = { status }
    if (status === 'EXPORTED') {
      updateData.exportedAt = new Date()
    } else if (status === 'PAID') {
      updateData.paidAt = new Date()
    }

    const plata = await db.plataBancaraPending.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ plata })
  } catch (error) {
    console.error('PUT plati-bancare error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// DELETE - remove pending payment
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
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    // Find and verify ownership
    const existing = await db.plataBancaraPending.findUnique({
      where: { id },
      include: { asociatie: true }
    })

    if (!existing || existing.asociatie.adminId !== userId) {
      return NextResponse.json({ error: 'Plată negăsită' }, { status: 404 })
    }

    // Only allow deletion of pending payments
    if (existing.status !== 'PENDING') {
      return NextResponse.json({
        error: 'Nu poți șterge o plată care a fost deja exportată'
      }, { status: 400 })
    }

    await db.plataBancaraPending.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE plati-bancare error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
