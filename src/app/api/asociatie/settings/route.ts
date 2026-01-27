import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateSettingsSchema = z.object({
  ziScadenta: z.number().int().min(1).max(31),
  penalizareZi: z.number().min(0).max(10),
  contBancar: z.string().optional(),
  banca: z.string().optional(),
})

// GET - Get association settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id

    // Get user's asociatie
    const asociatie = await db.asociatie.findFirst({
      where: { adminId: userId },
      select: {
        ziScadenta: true,
        penalizareZi: true,
        contBancar: true,
        banca: true,
      },
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    return NextResponse.json(asociatie)
  } catch (error) {
    console.error('Error fetching asociatie settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// PUT - Update association settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const body = await request.json()

    // Validate input
    const validatedData = updateSettingsSchema.parse(body)

    // Get user's asociatie
    const asociatie = await db.asociatie.findFirst({
      where: { adminId: userId },
      select: { id: true },
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    // Update settings
    const updated = await db.asociatie.update({
      where: { id: asociatie.id },
      data: {
        ziScadenta: validatedData.ziScadenta,
        penalizareZi: validatedData.penalizareZi,
        contBancar: validatedData.contBancar || null,
        banca: validatedData.banca || null,
      },
      select: {
        ziScadenta: true,
        penalizareZi: true,
        contBancar: true,
        banca: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error updating asociatie settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
