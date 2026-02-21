import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// GET — list documents for a unit
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const documente = await db.documentUnitate.findMany({
      where: { apartamentId: id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ documente })
  } catch (error) {
    console.error('Documents GET error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// POST — upload document for a unit
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { tip, titlu, descriere, fisierUrl, fisierNume, fisierSize } = body

    if (!tip || !titlu || !fisierUrl || !fisierNume) {
      return NextResponse.json({ error: 'Câmpuri obligatorii lipsă' }, { status: 400 })
    }

    // Verify apartment exists
    const apartament = await db.apartament.findUnique({
      where: { id },
      select: { id: true, numar: true, asociatieId: true },
    })
    if (!apartament) {
      return NextResponse.json({ error: 'Unitate negăsită' }, { status: 404 })
    }

    const document = await db.documentUnitate.create({
      data: {
        tip,
        titlu,
        descriere,
        fisierUrl,
        fisierNume,
        fisierSize: fisierSize || null,
        apartamentId: id,
        uploadedById: (session!.user as any).id,
      },
    })

    await logAudit({
      userId: (session!.user as any).id,
      userName: (session!.user as any).name || (session!.user as any).email || undefined,
      actiune: 'UPLOAD_DOCUMENT',
      entitate: 'DocumentUnitate',
      entitatId: document.id,
      valoriNoi: { tip, titlu, fisierNume, apartament: apartament.numar },
      asociatieId: apartament.asociatieId,
    })

    return NextResponse.json({ document })
  } catch (error) {
    console.error('Document upload error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// DELETE — remove document
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const docId = searchParams.get('docId')

    if (!docId) {
      return NextResponse.json({ error: 'docId obligatoriu' }, { status: 400 })
    }

    const document = await db.documentUnitate.findUnique({
      where: { id: docId },
      include: { apartament: { select: { numar: true, asociatieId: true } } },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document negăsit' }, { status: 404 })
    }

    await db.documentUnitate.delete({ where: { id: docId } })

    await logAudit({
      userId: (session!.user as any).id,
      userName: (session!.user as any).name || (session!.user as any).email || undefined,
      actiune: 'DELETE_DOCUMENT',
      entitate: 'DocumentUnitate',
      entitatId: docId,
      valoriVechi: { tip: document.tip, titlu: document.titlu, fisierNume: document.fisierNume },
      asociatieId: document.apartament.asociatieId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Document delete error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
