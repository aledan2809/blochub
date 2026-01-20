import { AgentType } from '@prisma/client'
import { BaseAgent, AgentInput, AgentOutput } from './base'
import { db } from '@/lib/db'

interface PaymentPrediction {
  apartamentId: string
  apartamentNumar: string
  probabilitateIntarziere: number // 0-100
  sumaEstimata: number
  factori: {
    istoricIntarzieri: number
    mediZileIntarziere: number
    restantaCurenta: number
    nrIntarzieriUltimeleLuni: number
    sezon: string
  }
  recomandare: string
}

export class PredictiePlataAgent extends BaseAgent {
  type = AgentType.PREDICTIE_PLATA
  name = 'Predictie Plata Agent'
  description = 'Prezice probabilitatea de întârziere la plată pentru fiecare apartament'

  protected async execute(input: AgentInput): Promise<AgentOutput> {
    const { asociatieId, luna, an } = input

    if (!asociatieId) {
      return {
        success: false,
        error: 'asociatieId required',
      }
    }

    const targetLuna = luna || new Date().getMonth() + 1
    const targetAn = an || new Date().getFullYear()

    try {
      // Get all apartments with payment history
      const apartamente = await db.apartament.findMany({
        where: { asociatieId },
        include: {
          chitante: {
            include: {
              plati: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 12, // Last 12 months
          },
        },
      })

      const predictions: PaymentPrediction[] = []

      for (const apt of apartamente) {
        // Calculate historical metrics
        let totalChitante = apt.chitante.length
        let intarzieri = 0
        let totalZileIntarziere = 0
        let intarzieriUltimele6Luni = 0

        for (let i = 0; i < apt.chitante.length; i++) {
          const chitanta = apt.chitante[i]
          const platiChitanta = chitanta.plati.filter((p) => p.status === 'CONFIRMED')

          if (platiChitanta.length > 0) {
            const primaPlata = platiChitanta.reduce((min, p) =>
              p.dataPlata < min.dataPlata ? p : min
            )

            const zileIntarziere = Math.floor(
              (primaPlata.dataPlata.getTime() - chitanta.dataScadenta.getTime()) /
                (1000 * 60 * 60 * 24)
            )

            if (zileIntarziere > 0) {
              intarzieri++
              totalZileIntarziere += zileIntarziere

              // Check if in last 6 months
              if (i < 6) {
                intarzieriUltimele6Luni++
              }
            }
          } else {
            // No payment = considered late
            const now = new Date()
            if (chitanta.dataScadenta < now) {
              intarzieri++
              intarzieriUltimele6Luni++
              totalZileIntarziere += Math.floor(
                (now.getTime() - chitanta.dataScadenta.getTime()) / (1000 * 60 * 60 * 24)
              )
            }
          }
        }

        // Calculate current restanta
        let restantaCurenta = 0
        for (const chitanta of apt.chitante) {
          const platiChitanta = chitanta.plati
            .filter((p) => p.status === 'CONFIRMED')
            .reduce((sum, p) => sum + p.suma, 0)
          const restanta = chitanta.sumaTotal - platiChitanta
          if (restanta > 0) {
            restantaCurenta += restanta
          }
        }

        // Calculate probability using simple ML-like scoring
        const historicRate = totalChitante > 0 ? (intarzieri / totalChitante) * 100 : 0
        const avgDaysLate = intarzieri > 0 ? totalZileIntarziere / intarzieri : 0
        const recentRate = Math.min(6, apt.chitante.length) > 0
          ? (intarzieriUltimele6Luni / Math.min(6, apt.chitante.length)) * 100
          : 0

        // Weighted score
        let probability =
          historicRate * 0.3 + // 30% weight on all-time history
          recentRate * 0.4 + // 40% weight on recent history
          Math.min(avgDaysLate, 30) * 1.5 + // Days late factor (max 45%)
          (restantaCurenta > 0 ? 20 : 0) // +20% if current debt

        // Seasonal adjustment (winter months tend to have more delays)
        const sezon = this.getSezon(targetLuna)
        if (sezon === 'iarna') {
          probability *= 1.1 // 10% more likely in winter
        }

        probability = Math.min(100, Math.max(0, probability))

        // Generate recommendation
        let recomandare = ''
        if (probability > 80) {
          recomandare = 'Trimite reminder cu 10 zile înainte de scadență + SMS'
        } else if (probability > 60) {
          recomandare = 'Trimite reminder cu 5 zile înainte de scadență'
        } else if (probability > 40) {
          recomandare = 'Trimite reminder standard la scadență'
        } else {
          recomandare = 'Risc scăzut - notificare standard'
        }

        // Estimate expected payment amount (from last chitanta or average)
        const lastChitanta = apt.chitante[0]
        const sumaEstimata = lastChitanta?.sumaTotal || 0

        predictions.push({
          apartamentId: apt.id,
          apartamentNumar: apt.numar,
          probabilitateIntarziere: Math.round(probability),
          sumaEstimata,
          factori: {
            istoricIntarzieri: Math.round(historicRate),
            mediZileIntarziere: Math.round(avgDaysLate),
            restantaCurenta,
            nrIntarzieriUltimeleLuni: intarzieriUltimele6Luni,
            sezon,
          },
          recomandare,
        })
      }

      // Sort by probability descending
      predictions.sort((a, b) => b.probabilitateIntarziere - a.probabilitateIntarziere)

      // Save predictions to database
      for (const pred of predictions) {
        await db.predictieRestanta.upsert({
          where: {
            asociatieId_apartamentId_luna_an: {
              asociatieId,
              apartamentId: pred.apartamentId,
              luna: targetLuna,
              an: targetAn,
            },
          },
          update: {
            probabilitate: pred.probabilitateIntarziere,
            sumaEstimata: pred.sumaEstimata,
            factori: JSON.stringify(pred.factori),
          },
          create: {
            asociatieId,
            apartamentId: pred.apartamentId,
            luna: targetLuna,
            an: targetAn,
            probabilitate: pred.probabilitateIntarziere,
            sumaEstimata: pred.sumaEstimata,
            factori: JSON.stringify(pred.factori),
          },
        })
      }

      // Calculate summary stats
      const highRisk = predictions.filter((p) => p.probabilitateIntarziere > 60).length
      const totalRestanta = predictions.reduce((sum, p) => sum + p.factori.restantaCurenta, 0)

      return {
        success: true,
        data: {
          predictions,
          summary: {
            totalApartamente: predictions.length,
            highRisk,
            totalRestanta,
            avgProbability:
              predictions.reduce((sum, p) => sum + p.probabilitateIntarziere, 0) /
              predictions.length,
          },
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  private getSezon(luna: number): string {
    if (luna >= 3 && luna <= 5) return 'primavara'
    if (luna >= 6 && luna <= 8) return 'vara'
    if (luna >= 9 && luna <= 11) return 'toamna'
    return 'iarna'
  }
}

export const predictiePlataAgent = new PredictiePlataAgent()
