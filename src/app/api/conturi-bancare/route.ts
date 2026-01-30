import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET bank accounts for an association
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const { searchParams } = new URL(request.url)
    const asociatieId = searchParams.get('asociatieId')

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

    const conturi = await db.contBancarAsociatie.findMany({
      where: { asociatieId },
      orderBy: [
        { esteImplicit: 'desc' },
        { createdAt: 'asc' }
      ]
    })

    return NextResponse.json({ conturi })
  } catch (error) {
    console.error('GET conturi-bancare error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// POST - create new bank account
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const body = await request.json()

    const { asociatieId, nume, iban, banca, codBic, esteImplicit } = body

    if (!asociatieId || !nume || !iban || !banca) {
      return NextResponse.json({ error: 'Date incomplete' }, { status: 400 })
    }

    // Verify user owns the association
    const asociatie = await db.asociatie.findFirst({
      where: { id: asociatieId, adminId: userId }
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    // If this account should be default, unset other defaults
    if (esteImplicit) {
      await db.contBancarAsociatie.updateMany({
        where: { asociatieId },
        data: { esteImplicit: false }
      })
    }

    // Create the account
    const cont = await db.contBancarAsociatie.create({
      data: {
        nume,
        iban: iban.replace(/\s/g, '').toUpperCase(),
        banca,
        codBic: codBic || null,
        esteImplicit: esteImplicit || false,
        asociatieId
      }
    })

    return NextResponse.json({ cont })
  } catch (error) {
    console.error('POST conturi-bancare error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// PUT - update bank account
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const body = await request.json()

    const { id, nume, iban, banca, codBic, esteImplicit } = body

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    // Find the account and verify ownership
    const existing = await db.contBancarAsociatie.findUnique({
      where: { id },
      include: { asociatie: true }
    })

    if (!existing || existing.asociatie.adminId !== userId) {
      return NextResponse.json({ error: 'Cont negăsit' }, { status: 404 })
    }

    // If this account should be default, unset other defaults
    if (esteImplicit) {
      await db.contBancarAsociatie.updateMany({
        where: { asociatieId: existing.asociatieId, id: { not: id } },
        data: { esteImplicit: false }
      })
    }

    const cont = await db.contBancarAsociatie.update({
      where: { id },
      data: {
        nume: nume || existing.nume,
        iban: iban ? iban.replace(/\s/g, '').toUpperCase() : existing.iban,
        banca: banca || existing.banca,
        codBic: codBic !== undefined ? codBic : existing.codBic,
        esteImplicit: esteImplicit !== undefined ? esteImplicit : existing.esteImplicit
      }
    })

    return NextResponse.json({ cont })
  } catch (error) {
    console.error('PUT conturi-bancare error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// DELETE - delete bank account
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

    // Find the account and verify ownership
    const existing = await db.contBancarAsociatie.findUnique({
      where: { id },
      include: {
        asociatie: true,
        _count: { select: { platiPending: true } }
      }
    })

    if (!existing || existing.asociatie.adminId !== userId) {
      return NextResponse.json({ error: 'Cont negăsit' }, { status: 404 })
    }

    // Check if there are pending payments
    if (existing._count.platiPending > 0) {
      return NextResponse.json({
        error: 'Nu poți șterge un cont care are plăți în așteptare'
      }, { status: 400 })
    }

    await db.contBancarAsociatie.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE conturi-bancare error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
