import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

const chiriasSchema = z.object({
  nume: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  telefon: z.string().optional().or(z.literal('')),
  apartamentId: z.string(),
  esteContactUrgenta: z.boolean().optional(),
})

// GET all chiriasi for user's asociatie
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id

    // Get user's asociatie
    const asociatie = await db.asociatie.findFirst({
      where: { adminId: userId },
    })

    if (!asociatie) {
      return NextResponse.json({ chiriasi: [] })
    }

    const chiriasi = await db.chirias.findMany({
      where: {
        apartament: {
          asociatieId: asociatie.id,
        },
        esteActiv: true,
      },
      include: {
        apartament: {
          select: {
            id: true,
            numar: true,
          },
        },
      },
      orderBy: [
        { apartament: { numar: 'asc' } },
        { nume: 'asc' },
      ],
    })

    return NextResponse.json({ chiriasi, asociatieId: asociatie.id })
  } catch (error) {
    console.error('Error fetching chiriasi:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chiriasi' },
      { status: 500 }
    )
  }
}

// POST create chirias
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const body = await request.json()
    const data = chiriasSchema.parse(body)

    // Verify user owns the apartament's asociatie
    const apartament = await db.apartament.findFirst({
      where: {
        id: data.apartamentId,
        asociatie: {
          adminId: userId,
        },
      },
    })

    if (!apartament) {
      return NextResponse.json(
        { error: 'Apartament not found or not authorized' },
        { status: 404 }
      )
    }

    // Create chirias
    const chirias = await db.chirias.create({
      data: {
        nume: data.nume,
        email: data.email || null,
        telefon: data.telefon || null,
        apartamentId: data.apartamentId,
        esteContactUrgenta: data.esteContactUrgenta || false,
      },
    })

    // Mark apartament as rented
    await db.apartament.update({
      where: { id: data.apartamentId },
      data: { esteInchiriat: true },
    })

    return NextResponse.json({ chirias }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating chirias:', error)
    return NextResponse.json(
      { error: 'Failed to create chirias' },
      { status: 500 }
    )
  }
}

// PUT update chirias
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const body = await request.json()

    // Verify user owns the chirias's apartament's asociatie
    const chirias = await db.chirias.findFirst({
      where: {
        id,
        apartament: {
          asociatie: {
            adminId: userId,
          },
        },
      },
    })

    if (!chirias) {
      return NextResponse.json(
        { error: 'Chirias not found or not authorized' },
        { status: 404 }
      )
    }

    const updated = await db.chirias.update({
      where: { id },
      data: {
        nume: body.nume,
        email: body.email || null,
        telefon: body.telefon || null,
        esteContactUrgenta: body.esteContactUrgenta,
        esteActiv: body.esteActiv,
      },
    })

    return NextResponse.json({ chirias: updated })
  } catch (error) {
    console.error('Error updating chirias:', error)
    return NextResponse.json(
      { error: 'Failed to update chirias' },
      { status: 500 }
    )
  }
}

// DELETE chirias
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    // Verify user owns the chirias's apartament's asociatie
    const chirias = await db.chirias.findFirst({
      where: {
        id,
        apartament: {
          asociatie: {
            adminId: userId,
          },
        },
      },
      include: {
        apartament: true,
      },
    })

    if (!chirias) {
      return NextResponse.json(
        { error: 'Chirias not found or not authorized' },
        { status: 404 }
      )
    }

    // Soft delete - mark as inactive
    await db.chirias.update({
      where: { id },
      data: { esteActiv: false },
    })

    // Check if there are other active chiriasi for this apartament
    const otherChiriasi = await db.chirias.count({
      where: {
        apartamentId: chirias.apartamentId,
        esteActiv: true,
        id: { not: id },
      },
    })

    // If no other chiriasi, mark apartament as not rented
    if (otherChiriasi === 0) {
      await db.apartament.update({
        where: { id: chirias.apartamentId },
        data: { esteInchiriat: false },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting chirias:', error)
    return NextResponse.json(
      { error: 'Failed to delete chirias' },
      { status: 500 }
    )
  }
}
