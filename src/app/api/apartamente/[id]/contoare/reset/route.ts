import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

const resetSchema = z.object({
  contorId: z.string(),
  notaExplicativa: z.string().min(10, 'Nota explicativă trebuie să aibă minim 10 caractere'),
  noulIndex: z.number().min(0).optional(),
})

// POST — reset meter index with mandatory explanatory note
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: apartamentId } = await params
    const body = await request.json()
    const parsed = resetSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Date invalide', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { contorId, notaExplicativa, noulIndex } = parsed.data

    // Get contor with last index
    const contor = await db.contor.findUnique({
      where: { id: contorId },
      include: {
        apartament: { select: { numar: true, asociatieId: true } },
        indexuri: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })

    if (!contor || contor.apartamentId !== apartamentId) {
      return NextResponse.json({ error: 'Contor negăsit' }, { status: 404 })
    }

    const lastIndex = contor.indexuri[0]
    const now = new Date()

    // Create new index entry with reset value
    const newIndex = await db.indexContor.create({
      data: {
        contorId,
        apartamentId,
        valoare: noulIndex ?? 0,
        dataIndex: now,
        luna: now.getMonth() + 1,
        an: now.getFullYear(),
        verificatManual: true,
      },
    })

    // Audit log with mandatory note
    await logAudit({
      userId: (session!.user as any).id,
      userName: (session!.user as any).name || (session!.user as any).email || undefined,
      actiune: 'RESET_CONTOR',
      entitate: 'Contor',
      entitatId: contorId,
      valoriVechi: lastIndex ? { valoare: lastIndex.valoare, data: lastIndex.dataIndex } : null,
      valoriNoi: { valoare: noulIndex ?? 0, data: now },
      notaExplicativa,
      asociatieId: contor.apartament.asociatieId,
    })

    return NextResponse.json({
      success: true,
      newIndex,
    })
  } catch (error) {
    console.error('Contor reset error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
