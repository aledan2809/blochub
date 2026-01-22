import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { sendEmail, emailTemplates } from '@/lib/email'

const updateTichetSchema = z.object({
  status: z.enum(['DESCHIS', 'IN_LUCRU', 'REZOLVAT', 'INCHIS']).optional(),
  prioritate: z.enum(['SCAZUTA', 'NORMALA', 'URGENTA']).optional(),
  asignatId: z.string().nullable().optional(),
})

// GET - Single tichet with comments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const { id } = await params
    const userId = (session.user as { id: string }).id

    const tichet = await db.tichet.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        },
        asignat: {
          select: { id: true, name: true }
        },
        comentarii: {
          where: {
            OR: [
              { esteIntern: false },
              // Admin sees internal comments too
              { tichet: { asociatie: { adminId: userId } } }
            ]
          },
          include: {
            autor: {
              select: { id: true, name: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        asociatie: {
          select: { adminId: true, nume: true }
        }
      }
    })

    if (!tichet) {
      return NextResponse.json({ error: 'Tichet negăsit' }, { status: 404 })
    }

    // Check access
    const isAdmin = tichet.asociatie.adminId === userId
    const isCreator = tichet.creatorId === userId

    if (!isAdmin && !isCreator) {
      return NextResponse.json({ error: 'Acces interzis' }, { status: 403 })
    }

    return NextResponse.json({ tichet, isAdmin })
  } catch (error) {
    console.error('Error fetching tichet:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// PUT - Update tichet (admin only for status/assignment)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const { id } = await params
    const userId = (session.user as { id: string }).id
    const body = await request.json()
    const data = updateTichetSchema.parse(body)

    // Check if user is admin of the tichet's asociatie
    const tichet = await db.tichet.findUnique({
      where: { id },
      include: {
        asociatie: { select: { adminId: true } },
        creator: { select: { email: true, name: true } }
      }
    })

    if (!tichet) {
      return NextResponse.json({ error: 'Tichet negăsit' }, { status: 404 })
    }

    if (tichet.asociatie.adminId !== userId) {
      return NextResponse.json(
        { error: 'Doar administratorul poate modifica tichetul' },
        { status: 403 }
      )
    }

    const updated = await db.tichet.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.prioritate && { prioritate: data.prioritate }),
        ...(data.asignatId !== undefined && { asignatId: data.asignatId }),
        ...(data.status === 'REZOLVAT' && { rezolvatLa: new Date() }),
      },
      include: {
        creator: { select: { name: true } },
        asignat: { select: { name: true } }
      }
    })

    // Send email notification to creator when status changes
    if (data.status && tichet.creator.email) {
      const statusLabels: Record<string, string> = {
        DESCHIS: 'Deschis',
        IN_LUCRU: 'În lucru',
        REZOLVAT: 'Rezolvat',
        INCHIS: 'Închis'
      }

      const emailData = emailTemplates.ticketStatusUpdate({
        titlu: updated.titlu,
        status: statusLabels[updated.status] || updated.status,
        link: `${process.env.NEXTAUTH_URL || 'https://blochub-cyan.vercel.app'}/portal`
      })

      // Send async - don't wait
      sendEmail({
        to: tichet.creator.email,
        subject: emailData.subject,
        html: emailData.html
      }).catch(err => console.error('[Tichet] Status update email failed:', err))
    }

    return NextResponse.json({ tichet: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Error updating tichet:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// DELETE - Delete tichet (admin or creator if DESCHIS)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const { id } = await params
    const userId = (session.user as { id: string }).id

    const tichet = await db.tichet.findUnique({
      where: { id },
      include: {
        asociatie: { select: { adminId: true } }
      }
    })

    if (!tichet) {
      return NextResponse.json({ error: 'Tichet negăsit' }, { status: 404 })
    }

    const isAdmin = tichet.asociatie.adminId === userId
    const isCreator = tichet.creatorId === userId

    // Creator can only delete if status is DESCHIS
    if (!isAdmin && (!isCreator || tichet.status !== 'DESCHIS')) {
      return NextResponse.json(
        { error: 'Nu poți șterge acest tichet' },
        { status: 403 }
      )
    }

    await db.tichet.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tichet:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
