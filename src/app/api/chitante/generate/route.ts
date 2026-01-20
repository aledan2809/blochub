import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { runAgent } from '@/agents'

const generateSchema = z.object({
  asociatieId: z.string(),
  luna: z.number().min(1).max(12),
  an: z.number().min(2020).max(2100),
  apartamentIds: z.array(z.string()).optional(),
  saveToDb: z.boolean().default(true),
})

// POST generate chitante
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = generateSchema.parse(body)

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

    // Run AI agent to calculate chitante
    const result = await runAgent(
      'CALCUL_CHITANTA',
      {
        asociatieId: data.asociatieId,
        luna: data.luna,
        an: data.an,
        apartamentIds: data.apartamentIds,
      },
      {
        asociatieId: data.asociatieId,
        userId: (session.user as any).id,
      }
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to calculate chitante' },
        { status: 500 }
      )
    }

    const { chitante, totalApartamente, totalSuma } = result.data

    // Save to database if requested
    if (data.saveToDb && chitante.length > 0) {
      for (const chitantaData of chitante) {
        // Check if chitanta already exists
        const existing = await db.chitanta.findUnique({
          where: {
            asociatieId_apartamentId_luna_an: {
              asociatieId: data.asociatieId,
              apartamentId: chitantaData.apartamentId,
              luna: data.luna,
              an: data.an,
            },
          },
        })

        if (existing) {
          // Update existing
          await db.chitanta.update({
            where: { id: existing.id },
            data: {
              sumaIntretinere: chitantaData.sumaIntretinere,
              sumaRestanta: chitantaData.sumaRestanta,
              sumaPenalizare: chitantaData.sumaPenalizare,
              sumaFonduri: chitantaData.sumaFonduri,
              sumaTotal: chitantaData.sumaTotal,
              detaliiJson: JSON.stringify(chitantaData.detalii),
              dataScadenta: chitantaData.dataScadenta,
              updatedAt: new Date(),
            },
          })
        } else {
          // Create new
          await db.chitanta.create({
            data: {
              numar: chitantaData.numar,
              luna: data.luna,
              an: data.an,
              sumaIntretinere: chitantaData.sumaIntretinere,
              sumaRestanta: chitantaData.sumaRestanta,
              sumaPenalizare: chitantaData.sumaPenalizare,
              sumaFonduri: chitantaData.sumaFonduri,
              sumaTotal: chitantaData.sumaTotal,
              dataScadenta: chitantaData.dataScadenta,
              detaliiJson: JSON.stringify(chitantaData.detalii),
              status: 'GENERATA',
              asociatieId: data.asociatieId,
              apartamentId: chitantaData.apartamentId,
            },
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      chitante,
      summary: {
        totalApartamente,
        totalSuma,
        luna: data.luna,
        an: data.an,
        savedToDb: data.saveToDb,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error generating chitante:', error)
    return NextResponse.json(
      { error: 'Failed to generate chitante' },
      { status: 500 }
    )
  }
}
