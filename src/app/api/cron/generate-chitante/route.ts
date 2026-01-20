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
              where: {
                luna: currentMonth,
                an: currentYear,
              },
            },
            contoare: {
              include: {
                indexuri: {
                  where: {
                    luna: currentMonth,
                    an: currentYear,
                  },
                },
              },
            },
            proprietari: {
              where: { esteActiv: true },
            },
          },
        },
        cheltuieli: {
          where: {
            luna: currentMonth,
            an: currentYear,
          },
        },
        fonduri: true,
      },
    })

    let generatedCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const asociatie of asociatii) {
      if (asociatie.cheltuieli.length === 0) {
        skippedCount += asociatie.apartamente.length
        continue
      }

      for (const apartament of asociatie.apartamente) {
        if (apartament.chitante.length > 0) {
          skippedCount++
          continue
        }

        const restantaAnterioara = await db.chitanta.aggregate({
          where: {
            apartamentId: apartament.id,
            status: {
              in: ['GENERATA', 'TRIMISA', 'PARTIAL_PLATITA', 'RESTANTA'],
            },
            OR: [
              { an: { lt: currentYear } },
              {
                an: currentYear,
                luna: { lt: currentMonth },
              },
            ],
          },
          _sum: { sumaTotal: true },
        })

        const platiConfirmate = await db.plata.aggregate({
          where: {
            apartamentId: apartament.id,
            status: 'CONFIRMED',
            chitanta: {
              OR: [
                { an: { lt: currentYear } },
                {
                  an: currentYear,
                  luna: { lt: currentMonth },
                },
              ],
            },
          },
          _sum: { suma: true },
        })

        const restanta = (restantaAnterioara._sum.sumaTotal || 0) - (platiConfirmate._sum.suma || 0)

        try {
          const result = await runAgent('CALCUL_CHITANTA', {
            apartament: {
              id: apartament.id,
              numar: apartament.numar,
              suprafata: apartament.suprafata,
              cotaIndiviza: apartament.cotaIndiviza,
              nrPersoane: apartament.nrPersoane,
            },
            cheltuieli: asociatie.cheltuieli.map(c => ({
              tip: c.tip,
              suma: c.suma,
              modRepartizare: c.modRepartizare,
            })),
            fonduri: asociatie.fonduri.map(f => ({
              tip: f.tip,
              sumaLunara: f.sumaLunara,
            })),
            indexuriContoare: apartament.contoare.flatMap(c =>
              c.indexuri.map(i => ({
                tip: c.tip,
                valoare: i.valoare,
              }))
            ),
            restantaAnterioara: restanta > 0 ? restanta : 0,
            penalizareZi: asociatie.penalizareZi,
            luna: currentMonth,
            an: currentYear,
          }, {
            asociatieId: asociatie.id,
          })

          if (result.success && result.data) {
            const lastChitanta = await db.chitanta.findFirst({
              where: { asociatieId: asociatie.id },
              orderBy: { numar: 'desc' },
            })

            const scadenta = new Date(currentYear, currentMonth - 1, asociatie.ziScadenta)

            await db.chitanta.create({
              data: {
                numar: (lastChitanta?.numar || 0) + 1,
                luna: currentMonth,
                an: currentYear,
                sumaIntretinere: result.data.sumaIntretinere,
                sumaRestanta: result.data.sumaRestanta,
                sumaPenalizare: result.data.sumaPenalizare,
                sumaFonduri: result.data.sumaFonduri,
                sumaTotal: result.data.sumaTotal,
                dataScadenta: scadenta,
                detaliiJson: JSON.stringify(result.data.detalii),
                asociatieId: asociatie.id,
                apartamentId: apartament.id,
              },
            })

            for (const proprietar of apartament.proprietari) {
              await db.notificare.create({
                data: {
                  tip: 'CHITANTA_NOUA',
                  titlu: 'Chitanță nouă disponibilă',
                  mesaj: `Chitanța pentru luna ${currentMonth}/${currentYear} este disponibilă. Suma de plată: ${result.data.sumaTotal.toFixed(2)} RON`,
                  userId: proprietar.userId,
                },
              })
            }

            generatedCount++
          }
        } catch (error) {
          console.error(`Error generating chitanta for apt ${apartament.id}:`, error)
          errorCount++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${generatedCount} chitante, skipped ${skippedCount}, ${errorCount} errors`,
      month: currentMonth,
      year: currentYear,
    })
  } catch (error) {
    console.error('Cron generate-chitante error:', error)
    return NextResponse.json(
      { error: 'Failed to generate chitante' },
      { status: 500 }
    )
  }
}
