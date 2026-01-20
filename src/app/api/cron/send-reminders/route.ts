import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { runAgent } from '@/agents'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const today = new Date()

    const chitanteRestante = await db.chitanta.findMany({
      where: {
        status: {
          in: ['GENERATA', 'TRIMISA', 'PARTIAL_PLATITA', 'RESTANTA'],
        },
        dataScadenta: {
          lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        apartament: {
          include: {
            proprietari: {
              where: { esteActiv: true },
              include: { user: true },
            },
          },
        },
        asociatie: true,
      },
    })

    let sentCount = 0
    let errorCount = 0

    for (const chitanta of chitanteRestante) {
      for (const proprietar of chitanta.apartament.proprietari) {
        if (!proprietar.user.email) continue

        const ziPanaScadenta = Math.ceil(
          (chitanta.dataScadenta.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        )

        const urgenta = ziPanaScadenta <= 0
          ? 'ridicat'
          : ziPanaScadenta <= 3
            ? 'mediu'
            : 'scazut'

        try {
          await runAgent('REMINDER', {
            userId: proprietar.userId,
            email: proprietar.user.email,
            nume: proprietar.user.name || 'Proprietar',
            chitantaId: chitanta.id,
            numarChitanta: chitanta.numar,
            luna: chitanta.luna,
            an: chitanta.an,
            suma: chitanta.sumaTotal,
            dataScadenta: chitanta.dataScadenta.toISOString(),
            asociatie: chitanta.asociatie.nume,
            urgenta,
            canal: 'email',
          }, {
            asociatieId: chitanta.asociatieId,
            userId: proprietar.userId,
          })

          sentCount++
        } catch (error) {
          console.error(`Error sending reminder to ${proprietar.user.email}:`, error)
          errorCount++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${sentCount} reminders, ${errorCount} errors`,
      processed: chitanteRestante.length,
    })
  } catch (error) {
    console.error('Cron send-reminders error:', error)
    return NextResponse.json(
      { error: 'Failed to process reminders' },
      { status: 500 }
    )
  }
}
