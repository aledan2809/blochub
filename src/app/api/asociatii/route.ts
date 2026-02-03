import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

const createAsociatieSchema = z.object({
  nume: z.string().min(2, 'Numele trebuie să aibă minim 2 caractere'),
  cui: z.string().optional(),
  adresa: z.string().min(5, 'Adresa este obligatorie'),
  oras: z.string().min(2, 'Orașul este obligatoriu'),
  judet: z.string().min(2, 'Județul este obligatoriu'),
  codPostal: z.string().optional(),
  email: z.string().email().optional(),
  telefon: z.string().optional(),
  contBancar: z.string().optional(),
  banca: z.string().optional(),
  ziScadenta: z.number().min(1).max(28).default(25),
  penalizareZi: z.number().min(0).max(1).default(0.0002),
})

// GET all asociatii for current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id

    const asociatii = await db.asociatie.findMany({
      where: { adminId: userId },
      include: {
        _count: {
          select: {
            apartamente: true,
            chitante: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ asociatii })
  } catch (error) {
    console.error('Error fetching asociatii:', error)
    return NextResponse.json(
      { error: 'Failed to fetch asociatii' },
      { status: 500 }
    )
  }
}

// POST create new asociatie
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const body = await request.json()
    const data = createAsociatieSchema.parse(body)

    // Check if CUI already exists
    if (data.cui) {
      const existing = await db.asociatie.findUnique({
        where: { cui: data.cui },
      })
      if (existing) {
        return NextResponse.json(
          { error: 'O asociație cu acest CUI există deja' },
          { status: 400 }
        )
      }
    }

    const asociatie = await db.asociatie.create({
      data: {
        ...data,
        adminId: userId,
      },
    })

    // Update user role to ADMIN if they're currently PROPRIETAR
    await db.user.update({
      where: { id: userId },
      data: {
        role: 'ADMIN',
      },
    })

    // Create default fonduri
    await db.fond.createMany({
      data: [
        {
          asociatieId: asociatie.id,
          tip: 'RULMENT',
          denumire: 'Fond Rulment',
          sumaLunara: 20, // Default 20 lei/apt
        },
        {
          asociatieId: asociatie.id,
          tip: 'REPARATII',
          denumire: 'Fond Reparații',
          sumaLunara: 10, // Default 10 lei/apt
        },
      ],
    })

    return NextResponse.json({ asociatie }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating asociatie:', error)
    return NextResponse.json(
      { error: 'Failed to create asociatie' },
      { status: 500 }
    )
  }
}
