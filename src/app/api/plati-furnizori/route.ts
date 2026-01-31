import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

// Schema for creating a payment
const plataSchema = z.object({
  cheltuialaId: z.string().min(1),
  suma: z.number().positive(),
  metodaPlata: z.enum(['CASH', 'TRANSFER', 'CARD', 'ALTELE']),
  referinta: z.string().nullish(), // Nr. chitanta / referinta bancara
  dataPlata: z.string().nullish(),
})

// GET - list expenses with payment info (for a specific expense or all)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const { searchParams } = new URL(request.url)
    const asociatieId = searchParams.get('asociatieId')
    const cheltuialaId = searchParams.get('cheltuialaId')
    const showPaid = searchParams.get('showPaid') === 'true'

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

    // If specific cheltuiala requested, return with payment details
    if (cheltuialaId) {
      const cheltuiala = await db.cheltuiala.findUnique({
        where: { id: cheltuialaId },
        include: {
          furnizor: { select: { id: true, nume: true, contBancar: true } },
          tipCustom: { select: { id: true, nume: true } },
          platiFurnizor: {
            orderBy: { dataPlata: 'desc' }
          }
        }
      })

      if (!cheltuiala) {
        return NextResponse.json({ error: 'Cheltuială negăsită' }, { status: 404 })
      }

      const sumaPlatita = cheltuiala.platiFurnizor.reduce((sum, p) => sum + p.suma, 0)
      const restDePlata = cheltuiala.suma - sumaPlatita

      return NextResponse.json({
        cheltuiala: {
          ...cheltuiala,
          sumaPlatita,
          restDePlata,
          esteAchitatIntegral: restDePlata <= 0
        }
      })
    }

    // Get all expenses with payment totals
    const cheltuieli = await db.cheltuiala.findMany({
      where: { asociatieId },
      include: {
        furnizor: { select: { id: true, nume: true, contBancar: true } },
        tipCustom: { select: { id: true, nume: true } },
        platiFurnizor: true
      },
      orderBy: [
        { dataFactura: 'desc' }
      ]
    })

    // Calculate payment stats for each expense
    const cheltuieliWithPayments = cheltuieli.map(ch => {
      const sumaPlatita = ch.platiFurnizor.reduce((sum, p) => sum + p.suma, 0)
      const restDePlata = ch.suma - sumaPlatita
      return {
        ...ch,
        sumaPlatita,
        restDePlata,
        esteAchitatIntegral: restDePlata <= 0
      }
    })

    // Filter by payment status if requested
    const filtered = showPaid
      ? cheltuieliWithPayments
      : cheltuieliWithPayments.filter(ch => ch.restDePlata > 0)

    // Calculate totals
    const unpaidTotal = cheltuieliWithPayments
      .filter(c => c.restDePlata > 0)
      .reduce((sum, c) => sum + c.restDePlata, 0)

    const paidTotal = cheltuieliWithPayments
      .reduce((sum, c) => sum + c.sumaPlatita, 0)

    return NextResponse.json({
      cheltuieli: filtered,
      stats: {
        unpaidCount: cheltuieliWithPayments.filter(c => c.restDePlata > 0).length,
        unpaidTotal,
        paidCount: cheltuieliWithPayments.filter(c => c.esteAchitatIntegral).length,
        paidTotal,
        totalFacturi: cheltuieli.reduce((sum, c) => sum + c.suma, 0)
      }
    })
  } catch (error) {
    console.error('GET plati-furnizori error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// POST - record a payment to a supplier
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const body = await request.json()

    const validatedData = plataSchema.parse(body)

    // Find the expense and verify ownership
    const cheltuiala = await db.cheltuiala.findUnique({
      where: { id: validatedData.cheltuialaId },
      include: {
        asociatie: true,
        furnizor: true,
        platiFurnizor: true
      }
    })

    if (!cheltuiala) {
      return NextResponse.json({ error: 'Cheltuială negăsită' }, { status: 404 })
    }

    if (cheltuiala.asociatie.adminId !== userId) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 403 })
    }

    if (!cheltuiala.furnizorId) {
      return NextResponse.json({ error: 'Cheltuiala nu are furnizor asociat' }, { status: 400 })
    }

    // Check if payment amount exceeds remaining balance
    const sumaPlatitaExistenta = cheltuiala.platiFurnizor.reduce((sum, p) => sum + p.suma, 0)
    const restDePlata = cheltuiala.suma - sumaPlatitaExistenta

    if (validatedData.suma > restDePlata + 0.01) { // Small tolerance for rounding
      return NextResponse.json({
        error: `Suma plății (${validatedData.suma} lei) depășește restul de plată (${restDePlata.toFixed(2)} lei)`
      }, { status: 400 })
    }

    // Create the payment
    const plata = await db.plataFurnizor.create({
      data: {
        suma: validatedData.suma,
        metodaPlata: validatedData.metodaPlata,
        referinta: validatedData.referinta || null,
        dataPlata: validatedData.dataPlata ? new Date(validatedData.dataPlata) : new Date(),
        cheltuialaId: cheltuiala.id,
        furnizorId: cheltuiala.furnizorId,
      }
    })

    // Update the legacy platita field if fully paid
    const newSumaPlatita = sumaPlatitaExistenta + validatedData.suma
    const esteAchitatIntegral = newSumaPlatita >= cheltuiala.suma - 0.01

    if (esteAchitatIntegral) {
      await db.cheltuiala.update({
        where: { id: cheltuiala.id },
        data: {
          platita: true,
          dataPlata: new Date(),
          metodaPlataFurnizor: validatedData.metodaPlata,
          referintaPlata: validatedData.referinta || null
        }
      })
    }

    return NextResponse.json({
      plata,
      sumaPlatita: newSumaPlatita,
      restDePlata: cheltuiala.suma - newSumaPlatita,
      esteAchitatIntegral
    }, { status: 201 })
  } catch (error) {
    console.error('POST plati-furnizori error:', error)
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ error: messages || 'Date invalide' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// DELETE - delete a payment (if needed to correct mistakes)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const { searchParams } = new URL(request.url)
    const plataId = searchParams.get('id')

    if (!plataId) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    // Find the payment and verify ownership
    const plata = await db.plataFurnizor.findUnique({
      where: { id: plataId },
      include: {
        cheltuiala: {
          include: {
            asociatie: true,
            platiFurnizor: true
          }
        }
      }
    })

    if (!plata) {
      return NextResponse.json({ error: 'Plată negăsită' }, { status: 404 })
    }

    if (plata.cheltuiala.asociatie.adminId !== userId) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 403 })
    }

    // Delete the payment
    await db.plataFurnizor.delete({
      where: { id: plataId }
    })

    // Recalculate if still fully paid
    const remainingPayments = plata.cheltuiala.platiFurnizor.filter(p => p.id !== plataId)
    const sumaPlatita = remainingPayments.reduce((sum, p) => sum + p.suma, 0)
    const esteAchitatIntegral = sumaPlatita >= plata.cheltuiala.suma - 0.01

    // Update legacy field
    await db.cheltuiala.update({
      where: { id: plata.cheltuialaId },
      data: {
        platita: esteAchitatIntegral,
        dataPlata: esteAchitatIntegral ? new Date() : null,
        metodaPlataFurnizor: esteAchitatIntegral ? remainingPayments[0]?.metodaPlata : null,
        referintaPlata: esteAchitatIntegral ? remainingPayments[0]?.referinta : null
      }
    })

    return NextResponse.json({
      success: true,
      sumaPlatita,
      restDePlata: plata.cheltuiala.suma - sumaPlatita,
      esteAchitatIntegral
    })
  } catch (error) {
    console.error('DELETE plati-furnizori error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
