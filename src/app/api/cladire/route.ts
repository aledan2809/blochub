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

    console.log('GET /api/cladire - params:', { asociatieId, userId })

    let asociatie
    if (asociatieId) {
      // Get specific asociatie by ID (if user is admin)
      asociatie = await db.asociatie.findFirst({
        where: { id: asociatieId, adminId: userId }
      })
      console.log('GET /api/cladire - found by ID:', asociatie?.id, asociatie?.nume)
    } else {
      // Fallback: get first asociatie for user
      asociatie = await db.asociatie.findFirst({
        where: { adminId: userId }
      })
      console.log('GET /api/cladire - fallback (first):', asociatie?.id, asociatie?.nume)
    }

    if (!asociatie) {
      console.log('GET /api/cladire - no asociatie found, returning null')
      return NextResponse.json({ asociatie: null, cladiri: [] })
    }

    // Get clădiri with scari
    const cladiri = await db.cladire.findMany({
      where: { asociatieId: asociatie.id },
      include: {
        scari: {
          include: {
            _count: {
              select: { apartamente: true }
            }
          },
          orderBy: { numar: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({ asociatie, cladiri })
  } catch (error) {
    console.error('GET cladire error:', error)
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

    // Verify user owns the association
    const asociatie = await db.asociatie.findFirst({
      where: { id: body.asociatieId, adminId: userId }
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    // Create clădire
    const cladire = await db.cladire.create({
      data: {
        nume: body.nume || 'Clădirea Principală',
        asociatieId: body.asociatieId,
      }
    })

    return NextResponse.json({ cladire }, { status: 201 })
  } catch (error) {
    console.error('POST cladire error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const body = await request.json()

    const asociatie = await db.asociatie.findFirst({
      where: { adminId: userId }
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    const updated = await db.asociatie.update({
      where: { id: asociatie.id },
      data: {
        nume: body.nume,
        cui: body.cui || null,
        adresa: body.adresa,
        oras: body.oras,
        judet: body.judet,
        codPostal: body.codPostal || null,
        email: body.email || null,
        telefon: body.telefon || null,
        contBancar: body.contBancar || null,
        banca: body.banca || null,
        ziScadenta: body.ziScadenta || 25,
        penalizareZi: body.penalizareZi || 0.0002,
      }
    })

    return NextResponse.json({ asociatie: updated })
  } catch (error) {
    console.error('PUT cladire error:', error)
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
    const cladireId = searchParams.get('id')

    if (!cladireId) {
      return NextResponse.json({ error: 'ID clădire necesar' }, { status: 400 })
    }

    // Verify user owns the association that owns this building
    const cladire = await db.cladire.findFirst({
      where: { id: cladireId },
      include: {
        asociatie: true,
        scari: true
      }
    })

    if (!cladire || cladire.asociatie.adminId !== userId) {
      return NextResponse.json({ error: 'Clădire negăsită' }, { status: 404 })
    }

    // Check if building has stairs
    if (cladire.scari.length > 0) {
      return NextResponse.json({
        error: 'Nu poți șterge o clădire care are scări. Șterge mai întâi scările.'
      }, { status: 400 })
    }

    await db.cladire.delete({ where: { id: cladireId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE cladire error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
