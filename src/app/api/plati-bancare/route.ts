import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET pending bank payments for an association
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const { searchParams } = new URL(request.url)
    const asociatieId = searchParams.get('asociatieId')
    const status = searchParams.get('status') // PENDING, EXPORTED, PAID, or null for all
    const contBancarId = searchParams.get('contBancarId')

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
    if (status) {
      where.status = status
    }
    if (contBancarId) {
      where.contBancarId = contBancarId
    }

    const plati = await db.plataBancaraPending.findMany({
      where,
      include: {
        contBancar: {
          select: { id: true, nume: true, iban: true, banca: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Group by bank account for stats
    const statsByBank = await db.plataBancaraPending.groupBy({
      by: ['contBancarId', 'status'],
      where: { asociatieId },
      _sum: { suma: true },
      _count: true
    })

    // Get bank accounts with their totals
    const conturi = await db.contBancarAsociatie.findMany({
      where: { asociatieId },
      include: {
        _count: {
          select: { platiPending: true }
        }
      }
    })

    return NextResponse.json({
      plati,
      statsByBank,
      conturi
    })
  } catch (error) {
    console.error('GET plati-bancare error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// POST - add payment to pending bank transfers
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const body = await request.json()

    const {
      asociatieId,
      contBancarId,
      beneficiarNume,
      beneficiarIban,
      beneficiarBanca,
      beneficiarCui,
      suma,
      descriere,
      referinta,
      cheltuialaId
    } = body

    if (!asociatieId || !contBancarId || !beneficiarNume || !beneficiarIban || !suma || !descriere) {
      return NextResponse.json({ error: 'Date incomplete' }, { status: 400 })
    }

    // Verify user owns the association
    const asociatie = await db.asociatie.findFirst({
      where: { id: asociatieId, adminId: userId }
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    // Verify bank account belongs to association
    const contBancar = await db.contBancarAsociatie.findFirst({
      where: { id: contBancarId, asociatieId }
    })

    if (!contBancar) {
      return NextResponse.json({ error: 'Cont bancar negăsit' }, { status: 404 })
    }

    // Create pending payment
    const plata = await db.plataBancaraPending.create({
      data: {
        beneficiarNume,
        beneficiarIban: beneficiarIban.replace(/\s/g, '').toUpperCase(),
        beneficiarBanca: beneficiarBanca || null,
        beneficiarCui: beneficiarCui || null,
        suma,
        descriere,
        referinta: referinta || null,
        cheltuialaId: cheltuialaId || null,
        contBancarId,
        asociatieId,
        status: 'PENDING'
      },
      include: {
        contBancar: {
          select: { id: true, nume: true, iban: true, banca: true }
        }
      }
    })

    return NextResponse.json({ plata })
  } catch (error) {
    console.error('POST plati-bancare error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// PUT - update payment (status or full edit)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const body = await request.json()

    const { id, status, beneficiarNume, beneficiarIban, suma, descriere, referinta, contBancarId } = body

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    // Find and verify ownership
    const existing = await db.plataBancaraPending.findUnique({
      where: { id },
      include: { asociatie: true }
    })

    if (!existing || existing.asociatie.adminId !== userId) {
      return NextResponse.json({ error: 'Plată negăsită' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    // Handle status update
    if (status) {
      updateData.status = status

      if (status === 'EXPORTED') {
        updateData.exportedAt = new Date()
      } else if (status === 'PAID') {
        updateData.paidAt = new Date()

        // Creează PlataFurnizor pentru a scădea soldul din cheltuială
        if (existing.cheltuialaId) {
          const cheltuiala = await db.cheltuiala.findUnique({
            where: { id: existing.cheltuialaId },
            include: { furnizor: true }
          })

          if (cheltuiala?.furnizorId) {
            await db.plataFurnizor.create({
              data: {
                suma: existing.suma,
                metodaPlata: 'TRANSFER',
                referinta: existing.referinta || `Export bancar - ${existing.beneficiarIban}`,
                dataPlata: new Date(),
                cheltuialaId: existing.cheltuialaId,
                furnizorId: cheltuiala.furnizorId,
              }
            })

            // Verifică dacă cheltuiala e achitată integral
            const platiFurnizor = await db.plataFurnizor.findMany({
              where: { cheltuialaId: existing.cheltuialaId }
            })
            const totalPlatit = platiFurnizor.reduce((sum, p) => sum + p.suma, 0)

            if (totalPlatit >= cheltuiala.suma - 0.01) {
              await db.cheltuiala.update({
                where: { id: existing.cheltuialaId },
                data: {
                  platita: true,
                  dataPlata: new Date(),
                  metodaPlataFurnizor: 'TRANSFER',
                  referintaPlata: existing.referinta
                }
              })
            }
          }
        }
      }
    }

    // Handle field edits
    if (beneficiarNume !== undefined) updateData.beneficiarNume = beneficiarNume
    if (beneficiarIban !== undefined) updateData.beneficiarIban = beneficiarIban.replace(/\s/g, '').toUpperCase()
    if (suma !== undefined) updateData.suma = suma
    if (descriere !== undefined) updateData.descriere = descriere
    if (referinta !== undefined) updateData.referinta = referinta || null
    if (contBancarId !== undefined) {
      // Verify bank account belongs to association
      const contBancar = await db.contBancarAsociatie.findFirst({
        where: { id: contBancarId, asociatieId: existing.asociatieId }
      })
      if (contBancar) {
        updateData.contBancarId = contBancarId
      }
    }

    const plata = await db.plataBancaraPending.update({
      where: { id },
      data: updateData,
      include: {
        contBancar: {
          select: { id: true, nume: true, iban: true, banca: true }
        }
      }
    })

    return NextResponse.json({ plata })
  } catch (error) {
    console.error('PUT plati-bancare error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// DELETE - remove pending payment
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
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    // Find and verify ownership
    const existing = await db.plataBancaraPending.findUnique({
      where: { id },
      include: { asociatie: true }
    })

    if (!existing || existing.asociatie.adminId !== userId) {
      return NextResponse.json({ error: 'Plată negăsită' }, { status: 404 })
    }

    // Only prevent deletion of PAID payments
    if (existing.status === 'PAID') {
      return NextResponse.json({
        error: 'Nu poți șterge o plată care a fost deja efectuată'
      }, { status: 400 })
    }

    await db.plataBancaraPending.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE plati-bancare error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
