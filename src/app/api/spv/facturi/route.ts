/**
 * SPV Invoices (Facturi) API Route
 *
 * Manages invoices downloaded from ANAF e-Factura system.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

// GET - List invoices
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id

    // Get user's association
    const asociatie = await db.asociatie.findFirst({
      where: { adminId: userId },
      select: { id: true },
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = { asociatieId: asociatie.id }

    if (status && ['NOUA', 'PROCESATA', 'IGNORATA', 'EROARE'].includes(status)) {
      where.status = status
    }

    // Get total count
    const total = await db.facturaSPV.count({ where })

    // Get invoices
    const facturi = await db.facturaSPV.findMany({
      where,
      orderBy: { dataFactura: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        spvId: true,
        cuiFurnizor: true,
        numeFurnizor: true,
        numarFactura: true,
        dataFactura: true,
        dataScadenta: true,
        sumaTotal: true,
        sumaTVA: true,
        moneda: true,
        status: true,
        cheltuialaId: true,
        importedAt: true,
      },
    })

    // Get stats
    const stats = await db.facturaSPV.groupBy({
      by: ['status'],
      where: { asociatieId: asociatie.id },
      _count: true,
      _sum: { sumaTotal: true },
    })

    return NextResponse.json({
      facturi,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: stats.reduce(
        (acc, s) => {
          acc[s.status] = { count: s._count, sum: s._sum.sumaTotal || 0 }
          return acc
        },
        {} as Record<string, { count: number; sum: number }>
      ),
    })
  } catch (error) {
    console.error('Error fetching SPV invoices:', error)
    return NextResponse.json(
      { error: 'Eroare la încărcarea facturilor' },
      { status: 500 }
    )
  }
}

// Update invoice status schema
const updateSchema = z.object({
  id: z.string().min(1, 'ID factură lipsă'),
  status: z.enum(['NOUA', 'PROCESATA', 'IGNORATA', 'EROARE']).optional(),
  cheltuialaId: z.string().nullable().optional(),
})

// PATCH - Update invoice status
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id

    // Get user's association
    const asociatie = await db.asociatie.findFirst({
      where: { adminId: userId },
      select: { id: true },
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    const body = await request.json()
    const data = updateSchema.parse(body)

    // Check if invoice belongs to this association
    const factura = await db.facturaSPV.findFirst({
      where: {
        id: data.id,
        asociatieId: asociatie.id,
      },
    })

    if (!factura) {
      return NextResponse.json({ error: 'Factură negăsită' }, { status: 404 })
    }

    // Update invoice
    const updated = await db.facturaSPV.update({
      where: { id: data.id },
      data: {
        status: data.status,
        cheltuialaId: data.cheltuialaId,
      },
    })

    return NextResponse.json({ factura: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error updating SPV invoice:', error)
    return NextResponse.json(
      { error: 'Eroare la actualizarea facturii' },
      { status: 500 }
    )
  }
}

// DELETE - Delete invoice (only if not processed)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id

    // Get user's association
    const asociatie = await db.asociatie.findFirst({
      where: { adminId: userId },
      select: { id: true },
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID factură lipsă' }, { status: 400 })
    }

    // Check if invoice exists and is not processed
    const factura = await db.facturaSPV.findFirst({
      where: {
        id,
        asociatieId: asociatie.id,
      },
    })

    if (!factura) {
      return NextResponse.json({ error: 'Factură negăsită' }, { status: 404 })
    }

    if (factura.status === 'PROCESATA' && factura.cheltuialaId) {
      return NextResponse.json(
        { error: 'Nu se poate șterge o factură procesată' },
        { status: 400 }
      )
    }

    // Delete invoice
    await db.facturaSPV.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting SPV invoice:', error)
    return NextResponse.json(
      { error: 'Eroare la ștergerea facturii' },
      { status: 500 }
    )
  }
}
