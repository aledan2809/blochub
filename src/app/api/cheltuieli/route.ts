import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'

const cheltuialaSchema = z.object({
  tip: z.enum([
    'APA_RECE', 'APA_CALDA', 'CANALIZARE', 'GAZ', 'CURENT_COMUN',
    'CALDURA', 'ASCENSOR', 'CURATENIE', 'GUNOI', 'FOND_RULMENT',
    'FOND_REPARATII', 'ADMINISTRARE', 'ALTE_CHELTUIELI'
  ]),
  tipCustomId: z.string().nullish(), // ID tip personalizat (folosit când tip = ALTE_CHELTUIELI)
  suma: z.number().positive(),
  descriere: z.string().nullish(),
  nrFactura: z.string().nullish(),
  modRepartizare: z.enum(['CONSUM', 'COTA_INDIVIZA', 'PERSOANE', 'APARTAMENT', 'MANUAL']).default('COTA_INDIVIZA'),
  asociatieId: z.string(),
  luna: z.number().min(1).max(12),
  an: z.number().min(2020).max(2100),
  dataFactura: z.string(),
  furnizorId: z.string().nullish(), // Allow null when creating new furnizor
  // New furnizor creation fields (when furnizorId is not provided)
  furnizorNume: z.string().nullish(),
  furnizorCui: z.string().nullish(),
  furnizorIban: z.string().nullish(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id

    const { searchParams } = new URL(request.url)
    const asociatieId = searchParams.get('asociatieId')
    const luna = searchParams.get('luna')
    const an = searchParams.get('an')

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

    const where: Record<string, unknown> = { asociatieId }
    if (luna) where.luna = parseInt(luna)
    if (an) where.an = parseInt(an)

    const cheltuieli = await db.cheltuiala.findMany({
      where,
      include: {
        furnizor: { select: { id: true, nume: true, cui: true, contBancar: true } },
        tipCustom: { select: { id: true, nume: true } }
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
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id

    const body = await request.json()
    const validatedData = cheltuialaSchema.parse(body)

    // Verify user owns the association
    const asociatie = await db.asociatie.findFirst({
      where: { id: validatedData.asociatieId, adminId: userId }
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    // Furnizor is mandatory - either existing or new
    let furnizorId = validatedData.furnizorId

    // If no furnizorId but furnizorNume provided, create new furnizor
    if (!furnizorId && validatedData.furnizorNume) {
      const newFurnizor = await db.furnizor.create({
        data: {
          nume: validatedData.furnizorNume,
          cui: validatedData.furnizorCui || null,
          contBancar: validatedData.furnizorIban || null,
          asociatieId: validatedData.asociatieId,
        }
      })
      furnizorId = newFurnizor.id
    }

    // Validate that furnizor is provided
    if (!furnizorId) {
      return NextResponse.json({ error: 'Furnizorul este obligatoriu' }, { status: 400 })
    }

    const cheltuiala = await db.cheltuiala.create({
      data: {
        tip: validatedData.tip,
        tipCustomId: validatedData.tipCustomId || null,
        suma: validatedData.suma,
        descriere: validatedData.descriere || null,
        nrFactura: validatedData.nrFactura || null,
        modRepartizare: validatedData.modRepartizare,
        asociatieId: validatedData.asociatieId,
        luna: validatedData.luna,
        an: validatedData.an,
        dataFactura: new Date(validatedData.dataFactura),
        furnizorId: furnizorId,
      },
      include: {
        furnizor: { select: { id: true, nume: true, cui: true, contBancar: true } },
        tipCustom: { select: { id: true, nume: true } }
      }
    })

    await logAudit({
      userId,
      userName: (session!.user as any).name || (session!.user as any).email || undefined,
      actiune: 'CREARE_CHELTUIALA',
      entitate: 'Cheltuiala',
      entitatId: cheltuiala.id,
      valoriNoi: { tip: cheltuiala.tip, suma: cheltuiala.suma, furnizor: cheltuiala.furnizor?.nume, luna: validatedData.luna, an: validatedData.an },
      asociatieId: validatedData.asociatieId,
    })

    return NextResponse.json({ cheltuiala }, { status: 201 })
  } catch (error) {
    console.error('POST cheltuiala error:', error)
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ error: messages || 'Date invalide' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

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
    const validatedData = cheltuialaSchema.partial().parse(body)

    // Find the cheltuiala and verify ownership
    const existing = await db.cheltuiala.findUnique({
      where: { id },
      include: { asociatie: true }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Cheltuială negăsită' }, { status: 404 })
    }

    if (existing.asociatie.adminId !== userId) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 403 })
    }

    // Handle new furnizor creation during edit
    let furnizorId = validatedData.furnizorId
    if (!furnizorId && validatedData.furnizorNume) {
      const newFurnizor = await db.furnizor.create({
        data: {
          nume: validatedData.furnizorNume,
          cui: validatedData.furnizorCui || null,
          contBancar: validatedData.furnizorIban || null,
          asociatieId: existing.asociatieId,
        }
      })
      furnizorId = newFurnizor.id
    }

    const cheltuiala = await db.cheltuiala.update({
      where: { id },
      data: {
        ...(validatedData.tip && { tip: validatedData.tip }),
        ...(validatedData.tipCustomId !== undefined && { tipCustomId: validatedData.tipCustomId || null }),
        ...(validatedData.suma && { suma: validatedData.suma }),
        ...(validatedData.descriere !== undefined && { descriere: validatedData.descriere || null }),
        ...(validatedData.nrFactura !== undefined && { nrFactura: validatedData.nrFactura || null }),
        ...(validatedData.modRepartizare && { modRepartizare: validatedData.modRepartizare }),
        ...(validatedData.luna && { luna: validatedData.luna }),
        ...(validatedData.an && { an: validatedData.an }),
        ...(validatedData.dataFactura && { dataFactura: new Date(validatedData.dataFactura) }),
        ...(furnizorId !== undefined && { furnizorId: furnizorId || null }),
      },
      include: {
        furnizor: { select: { id: true, nume: true, cui: true, contBancar: true } },
        tipCustom: { select: { id: true, nume: true } }
      }
    })

    await logAudit({
      userId,
      userName: (session!.user as any).name || (session!.user as any).email || undefined,
      actiune: 'MODIFICARE_CHELTUIALA',
      entitate: 'Cheltuiala',
      entitatId: id,
      valoriVechi: { tip: existing.tip, suma: existing.suma },
      valoriNoi: { tip: validatedData.tip, suma: validatedData.suma },
      asociatieId: existing.asociatieId,
    })

    return NextResponse.json({ cheltuiala })
  } catch (error) {
    console.error('PUT cheltuiala error:', error)
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ error: messages || 'Date invalide' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

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

    // Find the cheltuiala and verify ownership
    const existing = await db.cheltuiala.findUnique({
      where: { id },
      include: { asociatie: true }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Cheltuială negăsită' }, { status: 404 })
    }

    if (existing.asociatie.adminId !== userId) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 403 })
    }

    await db.cheltuiala.delete({ where: { id } })

    await logAudit({
      userId,
      userName: (session!.user as any).name || (session!.user as any).email || undefined,
      actiune: 'STERGERE_CHELTUIALA',
      entitate: 'Cheltuiala',
      entitatId: id,
      valoriVechi: { tip: existing.tip, suma: existing.suma },
      asociatieId: existing.asociatieId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE cheltuiala error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
