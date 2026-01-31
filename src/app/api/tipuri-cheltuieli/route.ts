import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const tipCheltuialaSchema = z.object({
  nume: z.string().min(1, 'Numele este obligatoriu').max(100),
  descriere: z.string().nullish(),
  asociatieId: z.string(),
})

// GET - List all custom expense types for an association
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

    const tipuri = await db.tipCheltuialaCustom.findMany({
      where: { asociatieId },
      orderBy: { nume: 'asc' },
      include: {
        _count: {
          select: { cheltuieli: true }
        }
      }
    })

    // Map to include cheltuieliCount
    const tipuriWithCount = tipuri.map(tip => ({
      id: tip.id,
      nume: tip.nume,
      descriere: tip.descriere,
      activ: tip.activ,
      cheltuieliCount: tip._count.cheltuieli,
      createdAt: tip.createdAt,
    }))

    return NextResponse.json({ tipuri: tipuriWithCount })
  } catch (error) {
    console.error('GET tipuri-cheltuieli error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// POST - Create a new custom expense type
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id

    const body = await request.json()
    const validatedData = tipCheltuialaSchema.parse(body)

    // Verify user owns the association
    const asociatie = await db.asociatie.findFirst({
      where: { id: validatedData.asociatieId, adminId: userId }
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    // Check for duplicate name
    const existing = await db.tipCheltuialaCustom.findFirst({
      where: {
        asociatieId: validatedData.asociatieId,
        nume: validatedData.nume
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Există deja un tip de cheltuială cu acest nume' },
        { status: 400 }
      )
    }

    const tip = await db.tipCheltuialaCustom.create({
      data: {
        nume: validatedData.nume,
        descriere: validatedData.descriere || null,
        asociatieId: validatedData.asociatieId,
      }
    })

    return NextResponse.json({ tip }, { status: 201 })
  } catch (error) {
    console.error('POST tipuri-cheltuieli error:', error)
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ error: messages || 'Date invalide' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// PUT - Update a custom expense type
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const body = await request.json()

    // Find the tip and verify ownership
    const existing = await db.tipCheltuialaCustom.findUnique({
      where: { id },
      include: { asociatie: true }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Tip cheltuială negăsit' }, { status: 404 })
    }

    if (existing.asociatie.adminId !== userId) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 403 })
    }

    // Check for duplicate name (excluding current)
    if (body.nume && body.nume !== existing.nume) {
      const duplicate = await db.tipCheltuialaCustom.findFirst({
        where: {
          asociatieId: existing.asociatieId,
          nume: body.nume,
          NOT: { id }
        }
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'Există deja un tip de cheltuială cu acest nume' },
          { status: 400 }
        )
      }
    }

    const tip = await db.tipCheltuialaCustom.update({
      where: { id },
      data: {
        ...(body.nume && { nume: body.nume }),
        ...(body.descriere !== undefined && { descriere: body.descriere || null }),
        ...(body.activ !== undefined && { activ: body.activ }),
      }
    })

    return NextResponse.json({ tip })
  } catch (error) {
    console.error('PUT tipuri-cheltuieli error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// DELETE - Delete a custom expense type (only if no cheltuieli are linked)
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
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    // Find the tip and verify ownership
    const existing = await db.tipCheltuialaCustom.findUnique({
      where: { id },
      include: {
        asociatie: true,
        _count: { select: { cheltuieli: true } }
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Tip cheltuială negăsit' }, { status: 404 })
    }

    if (existing.asociatie.adminId !== userId) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 403 })
    }

    // Check if any cheltuieli are linked
    if (existing._count.cheltuieli > 0) {
      return NextResponse.json(
        { error: `Nu se poate șterge. Există ${existing._count.cheltuieli} cheltuieli asociate.` },
        { status: 400 }
      )
    }

    await db.tipCheltuialaCustom.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE tipuri-cheltuieli error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
