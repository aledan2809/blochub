import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET individual association
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const { id } = params

    const asociatie = await db.asociatie.findFirst({
      where: { id, adminId: userId }
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    return NextResponse.json({ asociatie })
  } catch (error) {
    console.error('GET asociatie error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// PUT update association
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const { id } = params
    const body = await request.json()

    // Verify ownership
    const existing = await db.asociatie.findFirst({
      where: { id, adminId: userId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    const asociatie = await db.asociatie.update({
      where: { id },
      data: {
        nume: body.nume,
        adresa: body.adresa,
        oras: body.oras,
        judet: body.judet,
      }
    })

    return NextResponse.json({ asociatie })
  } catch (error) {
    console.error('PUT asociatie error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// DELETE association
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const { id } = params

    // Verify ownership
    const existing = await db.asociatie.findFirst({
      where: { id, adminId: userId },
      include: {
        _count: {
          select: { apartamente: true, cladiri: true }
        }
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    // Check if it has apartments or buildings
    if (existing._count.apartamente > 0 || existing._count.cladiri > 0) {
      return NextResponse.json({
        error: 'Nu poți șterge o asociație care are clădiri sau apartamente'
      }, { status: 400 })
    }

    await db.asociatie.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE asociatie error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
