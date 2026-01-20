import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

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

    const chitante = await db.chitanta.findMany({
      where,
      include: {
        apartament: { select: { numar: true } },
        plati: { select: { suma: true, status: true } }
      },
      orderBy: [
        { apartament: { numar: 'asc' } }
      ]
    })

    return NextResponse.json({ chitante })
  } catch (error) {
    console.error('GET chitante error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
