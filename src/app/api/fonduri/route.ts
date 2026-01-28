import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

const createFondSchema = z.object({
  tip: z.enum(['RULMENT', 'REPARATII', 'ALTE']),
  denumire: z.string().min(2, 'Denumirea trebuie să aibă minim 2 caractere'),
  sumaLunara: z.number().min(0, 'Suma trebuie să fie pozitivă'),
  descriere: z.string().optional(),
  asociatieId: z.string().optional(), // Optional - will use first asociatie if not provided
})

const updateFondSchema = z.object({
  id: z.string(),
  denumire: z.string().min(2).optional(),
  sumaLunara: z.number().min(0).optional(),
  descriere: z.string().optional(),
  soldCurent: z.number().optional(),
})

// GET - List fonduri for asociatie
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const { searchParams } = new URL(request.url)
    const asociatieId = searchParams.get('asociatieId')

    let asociatie
    if (asociatieId) {
      // Get specific asociatie by ID (verify user is admin)
      asociatie = await db.asociatie.findFirst({
        where: { id: asociatieId, adminId: userId }
      })
    } else {
      // Fallback: get first asociatie for user
      asociatie = await db.asociatie.findFirst({
        where: { adminId: userId }
      })
    }

    if (!asociatie) {
      return NextResponse.json({ fonduri: [], stats: { totalLunar: 0, totalSold: 0, count: 0 } })
    }

    const fonduri = await db.fond.findMany({
      where: { asociatieId: asociatie.id },
      orderBy: [{ tip: 'asc' }, { denumire: 'asc' }]
    })

    // Calculate total monthly contribution and total balance
    const totalLunar = fonduri.reduce((sum, f) => sum + f.sumaLunara, 0)
    const totalSold = fonduri.reduce((sum, f) => sum + f.soldCurent, 0)

    return NextResponse.json({
      fonduri,
      stats: {
        totalLunar,
        totalSold,
        count: fonduri.length
      }
    })
  } catch (error) {
    console.error('Error fetching fonduri:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// POST - Create fond
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const body = await request.json()
    const data = createFondSchema.parse(body)

    let asociatie
    if (data.asociatieId) {
      // Use provided asociatieId (verify user is admin)
      asociatie = await db.asociatie.findFirst({
        where: { id: data.asociatieId, adminId: userId }
      })
    } else {
      // Fallback: get first asociatie for user
      asociatie = await db.asociatie.findFirst({
        where: { adminId: userId }
      })
    }

    if (!asociatie) {
      return NextResponse.json({ error: 'Nu ai asociație' }, { status: 404 })
    }

    const fond = await db.fond.create({
      data: {
        tip: data.tip,
        denumire: data.denumire,
        sumaLunara: data.sumaLunara,
        asociatieId: asociatie.id,
      }
    })

    return NextResponse.json({ fond })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Error creating fond:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// PUT - Update fond
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const body = await request.json()
    const data = updateFondSchema.parse(body)

    // Verify ownership
    const fond = await db.fond.findUnique({
      where: { id: data.id },
      include: { asociatie: { select: { adminId: true } } }
    })

    if (!fond || fond.asociatie.adminId !== userId) {
      return NextResponse.json({ error: 'Fond negăsit' }, { status: 404 })
    }

    const updated = await db.fond.update({
      where: { id: data.id },
      data: {
        ...(data.denumire && { denumire: data.denumire }),
        ...(data.sumaLunara !== undefined && { sumaLunara: data.sumaLunara }),
        ...(data.soldCurent !== undefined && { soldCurent: data.soldCurent }),
      }
    })

    return NextResponse.json({ fond: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Error updating fond:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// DELETE - Delete fond
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
      return NextResponse.json({ error: 'ID lipsă' }, { status: 400 })
    }

    // Verify ownership
    const fond = await db.fond.findUnique({
      where: { id },
      include: { asociatie: { select: { adminId: true } } }
    })

    if (!fond || fond.asociatie.adminId !== userId) {
      return NextResponse.json({ error: 'Fond negăsit' }, { status: 404 })
    }

    await db.fond.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting fond:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
