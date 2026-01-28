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

    const { searchParams } = new URL(request.url)
    const asociatieId = searchParams.get('asociatieId')

    if (!asociatieId) {
      return NextResponse.json({ error: 'asociatieId necesar' }, { status: 400 })
    }

    const scari = await db.scara.findMany({
      where: { asociatieId },
      include: { _count: { select: { apartamente: true } } },
      orderBy: { numar: 'asc' },
    })

    return NextResponse.json({ scari })
  } catch (error) {
    console.error('GET scari error:', error)
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

    // Bulk create if array provided
    if (body.scari && Array.isArray(body.scari)) {
      if (!body.cladireId) {
        return NextResponse.json({ error: 'cladireId necesar' }, { status: 400 })
      }

      const scariData = body.scari.map((s: { numar: string; etaje?: number }) => ({
        numar: s.numar,
        etaje: s.etaje || 10,
        cladireId: body.cladireId,
        asociatieId: body.asociatieId, // Păstrat pentru compatibilitate
      }))

      await db.scara.createMany({
        data: scariData,
        skipDuplicates: true,
      })

      // Return created scari
      const scari = await db.scara.findMany({
        where: {
          cladireId: body.cladireId,
          numar: { in: body.scari.map((s: { numar: string }) => s.numar) },
        },
        orderBy: { numar: 'asc' },
      })

      return NextResponse.json({ scari }, { status: 201 })
    }

    // Single create
    if (!body.cladireId) {
      return NextResponse.json({ error: 'cladireId necesar' }, { status: 400 })
    }

    if (!body.numar) {
      return NextResponse.json({ error: 'Numărul scării este necesar' }, { status: 400 })
    }

    // Check if scara with same number already exists in this cladire
    const existingScara = await db.scara.findFirst({
      where: {
        cladireId: body.cladireId,
        numar: body.numar
      }
    })

    if (existingScara) {
      return NextResponse.json({ error: `Scara ${body.numar} există deja în această clădire` }, { status: 400 })
    }

    const scara = await db.scara.create({
      data: {
        numar: body.numar,
        etaje: body.etaje || 10,
        cladireId: body.cladireId,
        asociatieId: body.asociatieId,
      }
    })

    console.log('Scara created successfully:', scara)
    return NextResponse.json({ scara }, { status: 201 })
  } catch (error) {
    console.error('POST scara error:', error)
    return NextResponse.json({ error: 'Eroare la crearea scării: ' + (error as Error).message }, { status: 500 })
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
    const scaraId = searchParams.get('id')

    if (!scaraId) {
      return NextResponse.json({ error: 'ID scară necesar' }, { status: 400 })
    }

    // Verify user owns the association that owns this scara
    const scara = await db.scara.findFirst({
      where: { id: scaraId },
      include: { asociatie: true }
    })

    if (!scara || scara.asociatie.adminId !== userId) {
      return NextResponse.json({ error: 'Scară negăsită' }, { status: 404 })
    }

    // Unlink apartments from this scara (don't delete them)
    await db.apartament.updateMany({
      where: { scaraId },
      data: { scaraId: null }
    })

    await db.scara.delete({ where: { id: scaraId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE scara error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
