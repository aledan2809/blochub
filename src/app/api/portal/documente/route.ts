import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

// GET - List documents and invoices for proprietar
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all' // 'all', 'documents', 'facturi'

    // Find user's apartament and asociatie
    const proprietar = await db.proprietarApartament.findFirst({
      where: { userId, esteActiv: true },
      include: {
        apartament: {
          include: {
            asociatie: true
          }
        }
      }
    })

    if (!proprietar) {
      return NextResponse.json({ error: 'Nu ești proprietar' }, { status: 403 })
    }

    const asociatieId = proprietar.apartament.asociatieId
    const result: any = {
      asociatie: {
        nume: proprietar.apartament.asociatie.nume,
        adresa: proprietar.apartament.asociatie.adresa
      }
    }

    // Get official documents (AVG, regulamente, etc.)
    if (type === 'all' || type === 'documents') {
      result.documente = await db.document.findMany({
        where: { asociatieId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          tip: true,
          titlu: true,
          descriere: true,
          fisierUrl: true,
          fisierNume: true,
          createdAt: true
        }
      })
    }

    // Get invoices with scanned images (for transparency)
    if (type === 'all' || type === 'facturi') {
      const { searchParams } = new URL(request.url)
      const luna = searchParams.get('luna') ? parseInt(searchParams.get('luna')!) : undefined
      const an = searchParams.get('an') ? parseInt(searchParams.get('an')!) : undefined

      result.facturi = await db.cheltuiala.findMany({
        where: {
          asociatieId,
          imagineUrl: { not: null }, // Only those with scanned images
          ...(luna && { luna }),
          ...(an && { an })
        },
        orderBy: [{ an: 'desc' }, { luna: 'desc' }, { dataFactura: 'desc' }],
        select: {
          id: true,
          tip: true,
          descriere: true,
          suma: true,
          dataFactura: true,
          nrFactura: true,
          imagineUrl: true,
          luna: true,
          an: true,
          furnizor: {
            select: { nume: true }
          }
        }
      })

      // Group by month for easier display
      const grupate: Record<string, typeof result.facturi> = {}
      for (const factura of result.facturi) {
        const key = `${factura.an}-${factura.luna.toString().padStart(2, '0')}`
        if (!grupate[key]) grupate[key] = []
        grupate[key].push(factura)
      }
      result.facturiGrupate = grupate
    }

    // Get recent anunturi
    if (type === 'all') {
      result.anunturi = await db.anunt.findMany({
        where: {
          asociatieId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        orderBy: [{ important: 'desc' }, { createdAt: 'desc' }],
        take: 5,
        select: {
          id: true,
          titlu: true,
          continut: true,
          important: true,
          createdAt: true
        }
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
