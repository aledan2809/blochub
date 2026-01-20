import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const cheltuialaSchema = z.object({
  tip: z.enum([
    'APA_RECE', 'APA_CALDA', 'CANALIZARE', 'GAZ', 'CURENT_COMUN',
    'CALDURA', 'ASCENSOR', 'CURATENIE', 'GUNOI', 'FOND_RULMENT',
    'FOND_REPARATII', 'ADMINISTRARE', 'ALTE_CHELTUIELI'
  ]),
  suma: z.number().positive(),
  descriere: z.string().optional(),
  nrFactura: z.string().optional(),
  modRepartizare: z.enum(['CONSUM', 'COTA_INDIVIZA', 'PERSOANE', 'APARTAMENT', 'MANUAL']).default('COTA_INDIVIZA'),
  asociatieId: z.string(),
  luna: z.number().min(1).max(12),
  an: z.number().min(2020).max(2100),
  dataFactura: z.string(),
  furnizorId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const asociatieId = searchParams.get('asociatieId')
    const luna = searchParams.get('luna')
    const an = searchParams.get('an')

    if (!asociatieId) {
      return NextResponse.json({ error: 'asociatieId required' }, { status: 400 })
    }

    // Verify user owns the association
    const asociatie = await db.asociatie.findFirst({
      where: { id: asociatieId, adminId: session.user.id }
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    const where: Record<string, unknown> = { asociatieId }
    if (luna) where.luna = parseInt(luna)
    if (an) where.an = parseInt(an)

    const cheltuieli = await db.cheltuiala.findMany({
      where,
      include: {
        furnizor: { select: { nume: true } }
      },
      orderBy: { dataFactura: 'desc' }
    })

    return NextResponse.json({ cheltuieli })
  } catch (error) {
    console.error('GET cheltuieli error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = cheltuialaSchema.parse(body)

    // Verify user owns the association
    const asociatie = await db.asociatie.findFirst({
      where: { id: validatedData.asociatieId, adminId: session.user.id }
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    const cheltuiala = await db.cheltuiala.create({
      data: {
        tip: validatedData.tip,
        suma: validatedData.suma,
        descriere: validatedData.descriere || null,
        nrFactura: validatedData.nrFactura || null,
        modRepartizare: validatedData.modRepartizare,
        asociatieId: validatedData.asociatieId,
        luna: validatedData.luna,
        an: validatedData.an,
        dataFactura: new Date(validatedData.dataFactura),
        furnizorId: validatedData.furnizorId || null,
      },
      include: {
        furnizor: { select: { nume: true } }
      }
    })

    return NextResponse.json({ cheltuiala }, { status: 201 })
  } catch (error) {
    console.error('POST cheltuiala error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
