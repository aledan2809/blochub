import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id

    const asociatie = await db.asociatie.findFirst({
      where: { adminId: userId }
    })

    if (!asociatie) {
      return NextResponse.json({ asociatie: null, scari: [] })
    }

    const scari = await db.scara.findMany({
      where: { asociatieId: asociatie.id },
      include: {
        _count: {
          select: { apartamente: true }
        }
      },
      orderBy: { numar: 'asc' }
    })

    return NextResponse.json({ asociatie, scari })
  } catch (error) {
    console.error('GET cladire error:', error)
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
