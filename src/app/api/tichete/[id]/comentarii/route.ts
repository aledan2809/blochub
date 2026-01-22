import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

const createComentariuSchema = z.object({
  continut: z.string().min(1, 'Comentariul nu poate fi gol'),
  esteIntern: z.boolean().optional(),
})

// POST - Add comment to tichet
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const { id: tichetId } = await params
    const userId = (session.user as { id: string }).id
    const body = await request.json()
    const data = createComentariuSchema.parse(body)

    // Check tichet exists and user has access
    const tichet = await db.tichet.findUnique({
      where: { id: tichetId },
      include: {
        asociatie: { select: { adminId: true } }
      }
    })

    if (!tichet) {
      return NextResponse.json({ error: 'Tichet negăsit' }, { status: 404 })
    }

    const isAdmin = tichet.asociatie.adminId === userId
    const isCreator = tichet.creatorId === userId

    if (!isAdmin && !isCreator) {
      return NextResponse.json({ error: 'Acces interzis' }, { status: 403 })
    }

    // Only admin can add internal comments
    const esteIntern = isAdmin ? (data.esteIntern || false) : false

    const comentariu = await db.comentariuTichet.create({
      data: {
        continut: data.continut,
        esteIntern,
        tichetId,
        autorId: userId,
      },
      include: {
        autor: {
          select: { id: true, name: true }
        }
      }
    })

    // If admin replies, change status to IN_LUCRU if it was DESCHIS
    if (isAdmin && tichet.status === 'DESCHIS') {
      await db.tichet.update({
        where: { id: tichetId },
        data: { status: 'IN_LUCRU' }
      })
    }

    return NextResponse.json({ comentariu })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Error creating comentariu:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
