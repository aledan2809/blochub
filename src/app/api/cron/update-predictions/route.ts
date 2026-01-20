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
    const currentMonth = today.getMonth() + 1
    const currentYear = today.getFullYear()

    const asociatii = await db.asociatie.findMany({
      include: {
        apartamente: {
          include: {
            chitante: {
              orderBy: { createdAt: 'desc' },
              take: 12,
            },
            plati: {
              orderBy: { dataPlata: 'desc' },
              take: 24,
            },
          },
        },
      },
    })

    let predictionsCount = 0
    let errorCount = 0

    for (const asociatie of asociatii) {
      for (const apartament of asociatie.apartamente) {
        const istoricPlati = apartament.chitante.map(c => {
          const platiChitanta = apartament.plati.filter(p => p.chitantaId === c.id)
          const sumaPlatita = platiChitanta.reduce((acc, p) => acc + p.suma, 0)
          const datePlati = platiChitanta.map(p => p.dataPlata)

          return {
            luna: c.luna,
            an: c.an,
            sumaTotal: c.sumaTotal,
            sumaPlatita,
            dataScadenta: c.dataScadenta,
            datePlati,
            platitLaTimp: datePlati.some(d => d <= c.dataScadenta),
            restanta: c.sumaTotal - sumaPlatita,
          }
        })

        try {
          const result = await runAgent('PREDICTIE_PLATA', {
            apartamentId: apartament.id,
            istoricPlati,
            lunaPredict: currentMonth,
            anPredict: currentYear,
          }, {
            asociatieId: asociatie.id,
          })

          if (result.success && result.data) {
            await db.predictieRestanta.upsert({
              where: {
                asociatieId_apartamentId_luna_an: {
                  asociatieId: asociatie.id,
                  apartamentId: apartament.id,
                  luna: currentMonth,
                  an: currentYear,
                },
              },
              update: {
                probabilitate: result.data.probabilitateRestanta,
                sumaEstimata: result.data.sumaEstimata,
                factori: JSON.stringify(result.data.factori),
              },
              create: {
                asociatieId: asociatie.id,
                apartamentId: apartament.id,
                luna: currentMonth,
                an: currentYear,
                probabilitate: result.data.probabilitateRestanta,
                sumaEstimata: result.data.sumaEstimata,
                factori: JSON.stringify(result.data.factori),
              },
            })
            predictionsCount++
          }
        } catch (error) {
          console.error(`Error predicting for apt ${apartament.id}:`, error)
          errorCount++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${predictionsCount} predictions, ${errorCount} errors`,
      asociatiiProcessed: asociatii.length,
    })
  } catch (error) {
    console.error('Cron update-predictions error:', error)
    return NextResponse.json(
      { error: 'Failed to update predictions' },
      { status: 500 }
    )
  }
}
