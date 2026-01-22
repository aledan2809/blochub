import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

const createTipSchema = z.object({
  asociatieId: z.string(),
  denumire: z.string(),
  nrCamere: z.number().min(1),
  suprafata: z.number().min(1),
  cotaIndiviza: z.number().min(0).max(100),
})

// GET tipuri apartament for an asociatie
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const asociatieId = searchParams.get('asociatieId')

    if (!asociatieId) {
      return NextResponse.json(
        { error: 'asociatieId required' },
        { status: 400 }
      )
    }

    const tipuri = await db.tipApartament.findMany({
      where: { asociatieId },
      orderBy: [{ nrCamere: 'asc' }, { suprafata: 'asc' }],
    })

    return NextResponse.json({ tipuri })
  } catch (error) {
    console.error('Error fetching tipuri apartament:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tipuri apartament' },
      { status: 500 }
    )
  }
}

// POST create tip apartament
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = createTipSchema.parse(body)

    // Verify user owns asociatie
    const asociatie = await db.asociatie.findFirst({
      where: {
        id: data.asociatieId,
        adminId: (session.user as { id: string }).id,
      },
    })

    if (!asociatie) {
      return NextResponse.json(
        { error: 'Asociație not found or not authorized' },
        { status: 404 }
      )
    }

    // Check for duplicate
    const existing = await db.tipApartament.findUnique({
      where: {
        asociatieId_denumire: {
          asociatieId: data.asociatieId,
          denumire: data.denumire,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: `Tipul "${data.denumire}" există deja` },
        { status: 400 }
      )
    }

    const tip = await db.tipApartament.create({
      data,
    })

    return NextResponse.json({ tip }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating tip apartament:', error)
    return NextResponse.json(
      { error: 'Failed to create tip apartament' },
      { status: 500 }
    )
  }
}

// PUT update tip apartament
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const body = await request.json()
    const data = createTipSchema.partial().parse(body)

    // Verify user owns the tip's asociatie
    const tip = await db.tipApartament.findUnique({
      where: { id },
      include: { asociatie: true },
    })

    if (!tip) {
      return NextResponse.json({ error: 'Tip not found' }, { status: 404 })
    }

    if (tip.asociatie.adminId !== (session.user as { id: string }).id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const updated = await db.tipApartament.update({
      where: { id },
      data,
    })

    return NextResponse.json({ tip: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error updating tip apartament:', error)
    return NextResponse.json(
      { error: 'Failed to update tip apartament' },
      { status: 500 }
    )
  }
}

// DELETE tip apartament
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    // Verify user owns the tip's asociatie
    const tip = await db.tipApartament.findUnique({
      where: { id },
      include: { asociatie: true },
    })

    if (!tip) {
      return NextResponse.json({ error: 'Tip not found' }, { status: 404 })
    }

    if (tip.asociatie.adminId !== (session.user as { id: string }).id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    await db.tipApartament.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tip apartament:', error)
    return NextResponse.json(
      { error: 'Failed to delete tip apartament' },
      { status: 500 }
    )
  }
}
