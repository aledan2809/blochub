import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

const createApartamentSchema = z.object({
  asociatieId: z.string(),
  numar: z.string(),
  etaj: z.number().optional(),
  suprafata: z.number().optional(),
  nrCamere: z.number().optional(),
  cotaIndiviza: z.number().optional(),
  nrPersoane: z.number().default(1),
  scaraId: z.string().optional(),
})

const bulkCreateSchema = z.object({
  asociatieId: z.string(),
  apartamente: z.array(createApartamentSchema.omit({ asociatieId: true })),
})

// GET apartamente for an asociatie
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

    const apartamente = await db.apartament.findMany({
      where: { asociatieId },
      include: {
        scara: true,
        proprietari: {
          where: { esteActiv: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        contoare: true,
        _count: {
          select: {
            chitante: true,
            plati: true,
          },
        },
      },
      orderBy: { numar: 'asc' },
    })

    return NextResponse.json({ apartamente })
  } catch (error) {
    console.error('Error fetching apartamente:', error)
    return NextResponse.json(
      { error: 'Failed to fetch apartamente' },
      { status: 500 }
    )
  }
}

// POST create apartament(e)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Check if bulk create
    if (body.apartamente && Array.isArray(body.apartamente)) {
      const data = bulkCreateSchema.parse(body)

      // Verify user owns asociatie
      const asociatie = await db.asociatie.findFirst({
        where: {
          id: data.asociatieId,
          adminId: (session.user as any).id,
        },
      })

      if (!asociatie) {
        return NextResponse.json(
          { error: 'Asociație not found or not authorized' },
          { status: 404 }
        )
      }

      // Create all apartamente
      const created = await db.apartament.createMany({
        data: data.apartamente.map((apt) => ({
          ...apt,
          asociatieId: data.asociatieId,
        })),
        skipDuplicates: true,
      })

      return NextResponse.json({
        created: created.count,
        message: `${created.count} apartamente created`,
      })
    } else {
      // Single create
      const data = createApartamentSchema.parse(body)

      // Verify user owns asociatie
      const asociatie = await db.asociatie.findFirst({
        where: {
          id: data.asociatieId,
          adminId: (session.user as any).id,
        },
      })

      if (!asociatie) {
        return NextResponse.json(
          { error: 'Asociație not found or not authorized' },
          { status: 404 }
        )
      }

      // Check if apartament already exists
      const existing = await db.apartament.findUnique({
        where: {
          asociatieId_numar: {
            asociatieId: data.asociatieId,
            numar: data.numar,
          },
        },
      })

      if (existing) {
        return NextResponse.json(
          { error: `Apartamentul ${data.numar} există deja` },
          { status: 400 }
        )
      }

      const apartament = await db.apartament.create({
        data,
      })

      return NextResponse.json({ apartament }, { status: 201 })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating apartament:', error)
    return NextResponse.json(
      { error: 'Failed to create apartament' },
      { status: 500 }
    )
  }
}
