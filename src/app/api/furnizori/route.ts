import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Schema for creating a new furnizor
const furnizorSchema = z.object({
  nume: z.string().min(1, 'Numele este obligatoriu'),
  cui: z.string().optional().nullable(),
  adresa: z.string().optional().nullable(),
  telefon: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  contBancar: z.string().optional().nullable(), // IBAN
  asociatieId: z.string().min(1, 'Asociația este obligatorie'),
})

// GET /api/furnizori - List all furnizori for an association
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const asociatieId = searchParams.get('asociatieId')

    if (!asociatieId) {
      return NextResponse.json(
        { error: 'asociatieId is required' },
        { status: 400 }
      )
    }

    const furnizori = await prisma.furnizor.findMany({
      where: { asociatieId },
      orderBy: { nume: 'asc' },
      select: {
        id: true,
        nume: true,
        cui: true,
        contBancar: true,
        adresa: true,
        telefon: true,
        email: true,
      },
    })

    return NextResponse.json({ furnizori })
  } catch (error) {
    console.error('Error fetching furnizori:', error)
    return NextResponse.json(
      { error: 'Failed to fetch furnizori' },
      { status: 500 }
    )
  }
}

// POST /api/furnizori - Create a new furnizor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = furnizorSchema.parse(body)

    const furnizor = await prisma.furnizor.create({
      data: {
        nume: validatedData.nume,
        cui: validatedData.cui || null,
        adresa: validatedData.adresa || null,
        telefon: validatedData.telefon || null,
        email: validatedData.email || null,
        contBancar: validatedData.contBancar || null,
        asociatieId: validatedData.asociatieId,
      },
      select: {
        id: true,
        nume: true,
        cui: true,
        contBancar: true,
        adresa: true,
        telefon: true,
        email: true,
      },
    })

    return NextResponse.json(furnizor, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating furnizor:', error)
    return NextResponse.json(
      { error: 'Failed to create furnizor' },
      { status: 500 }
    )
  }
}

// PUT /api/furnizori - Update a furnizor
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Furnizor ID is required' },
        { status: 400 }
      )
    }

    const furnizor = await prisma.furnizor.update({
      where: { id },
      data: {
        nume: data.nume,
        cui: data.cui || null,
        adresa: data.adresa || null,
        telefon: data.telefon || null,
        email: data.email || null,
        contBancar: data.contBancar || null,
      },
      select: {
        id: true,
        nume: true,
        cui: true,
        contBancar: true,
        adresa: true,
        telefon: true,
        email: true,
      },
    })

    return NextResponse.json(furnizor)
  } catch (error) {
    console.error('Error updating furnizor:', error)
    return NextResponse.json(
      { error: 'Failed to update furnizor' },
      { status: 500 }
    )
  }
}

// DELETE /api/furnizori - Delete a furnizor
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Furnizor ID is required' },
        { status: 400 }
      )
    }

    // Check if furnizor has associated cheltuieli
    const cheltuieliCount = await prisma.cheltuiala.count({
      where: { furnizorId: id },
    })

    if (cheltuieliCount > 0) {
      return NextResponse.json(
        { error: `Nu se poate șterge furnizorul. Există ${cheltuieliCount} cheltuieli asociate.` },
        { status: 400 }
      )
    }

    await prisma.furnizor.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting furnizor:', error)
    return NextResponse.json(
      { error: 'Failed to delete furnizor' },
      { status: 500 }
    )
  }
}
