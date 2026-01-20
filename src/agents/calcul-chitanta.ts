import { AgentType, TipCheltuiala, ModRepartizare, StatusChitanta } from '@prisma/client'
import { BaseAgent, AgentInput, AgentOutput } from './base'
import { db } from '@/lib/db'
import { calculatePenalty } from '@/lib/utils'

interface ChitantaLineItem {
  denumire: string
  tip: TipCheltuiala
  suma: number
  cantitate?: number
  pretUnitar?: number
  detalii?: string
}

interface ChitantaData {
  apartamentId: string
  numar: number
  luna: number
  an: number
  sumaIntretinere: number
  sumaRestanta: number
  sumaPenalizare: number
  sumaFonduri: number
  sumaTotal: number
  detalii: ChitantaLineItem[]
  dataScadenta: Date
}

export class CalculChitantaAgent extends BaseAgent {
  type = AgentType.CALCUL_CHITANTA
  name = 'Calcul Chitanta Agent'
  description = 'Calculează automat chitanțele lunare pentru fiecare apartament'

  protected async execute(input: AgentInput): Promise<AgentOutput> {
    const { asociatieId, luna, an, apartamentIds } = input

    if (!asociatieId || !luna || !an) {
      return {
        success: false,
        error: 'asociatieId, luna and an are required',
      }
    }

    try {
      // Get asociatie with settings
      const asociatie = await db.asociatie.findUnique({
        where: { id: asociatieId },
        include: {
          fonduri: true,
          cheltuieli: {
            where: { luna, an },
          },
        },
      })

      if (!asociatie) {
        return {
          success: false,
          error: 'Asociație not found',
        }
      }

      // Get apartments
      const apartamente = await db.apartament.findMany({
        where: {
          asociatieId,
          ...(apartamentIds ? { id: { in: apartamentIds } } : {}),
        },
        include: {
          contoare: {
            include: {
              indexuri: {
                where: { luna, an },
                orderBy: { dataIndex: 'desc' },
                take: 1,
              },
            },
          },
          chitante: {
            where: {
              status: { in: ['RESTANTA', 'GENERATA', 'TRIMISA'] },
            },
          },
        },
      })

      // Get total cota indiviza for repartition
      const totalCota = await db.apartament.aggregate({
        where: { asociatieId },
        _sum: { cotaIndiviza: true },
      })

      const totalPersoane = await db.apartament.aggregate({
        where: { asociatieId },
        _sum: { nrPersoane: true },
      })

      // Calculate data scadenta
      const dataScadenta = new Date(an, luna - 1, asociatie.ziScadenta)
      if (dataScadenta < new Date()) {
        dataScadenta.setMonth(dataScadenta.getMonth() + 1)
      }

      // Get next chitanta number
      const lastChitanta = await db.chitanta.findFirst({
        where: { asociatieId },
        orderBy: { numar: 'desc' },
      })
      let numarChitanta = (lastChitanta?.numar || 0) + 1

      const chitante: ChitantaData[] = []

      for (const apt of apartamente) {
        const detalii: ChitantaLineItem[] = []
        let sumaIntretinere = 0

        // Process each cheltuiala
        for (const cheltuiala of asociatie.cheltuieli) {
          let sumaApartament = 0
          let cantitate: number | undefined
          let pretUnitar: number | undefined

          switch (cheltuiala.modRepartizare) {
            case ModRepartizare.COTA_INDIVIZA:
              // Repartizare pe cotă indiviză
              const cotaApt = apt.cotaIndiviza || 1
              const totalC = totalCota._sum.cotaIndiviza || 100
              sumaApartament = (cheltuiala.suma * cotaApt) / totalC
              break

            case ModRepartizare.PERSOANE:
              // Repartizare pe persoane
              const persApt = apt.nrPersoane || 1
              const totalP = totalPersoane._sum.nrPersoane || 1
              sumaApartament = (cheltuiala.suma * persApt) / totalP
              break

            case ModRepartizare.APARTAMENT:
              // Fix per apartament
              sumaApartament = cheltuiala.suma / apartamente.length
              break

            case ModRepartizare.CONSUM:
              // Pe baza indexurilor
              const contorTip = this.getTipContorForCheltuiala(cheltuiala.tip)
              if (contorTip) {
                const contor = apt.contoare.find((c) => c.tip === contorTip)
                if (contor && contor.indexuri.length > 0) {
                  // Get previous month index
                  const prevLuna = luna === 1 ? 12 : luna - 1
                  const prevAn = luna === 1 ? an - 1 : an
                  const prevIndex = await db.indexContor.findFirst({
                    where: {
                      contorId: contor.id,
                      luna: prevLuna,
                      an: prevAn,
                    },
                  })

                  const currentIndex = contor.indexuri[0]
                  if (prevIndex) {
                    cantitate = currentIndex.valoare - prevIndex.valoare
                    // Calculate pretUnitar from total and all consumptions
                    const totalConsum = await this.getTotalConsum(
                      asociatieId,
                      contorTip,
                      luna,
                      an
                    )
                    if (totalConsum > 0) {
                      pretUnitar = cheltuiala.suma / totalConsum
                      sumaApartament = cantitate * pretUnitar
                    }
                  }
                }
              }
              break
          }

          if (sumaApartament > 0) {
            sumaIntretinere += sumaApartament

            detalii.push({
              denumire: this.getDenumireCheltuiala(cheltuiala.tip),
              tip: cheltuiala.tip,
              suma: Math.round(sumaApartament * 100) / 100,
              cantitate,
              pretUnitar: pretUnitar ? Math.round(pretUnitar * 100) / 100 : undefined,
            })
          }
        }

        // Add fonduri
        let sumaFonduri = 0
        for (const fond of asociatie.fonduri) {
          sumaFonduri += fond.sumaLunara

          detalii.push({
            denumire: fond.denumire,
            tip: TipCheltuiala.FOND_RULMENT,
            suma: fond.sumaLunara,
          })
        }

        // Calculate restante
        let sumaRestanta = 0
        for (const chitantaVeche of apt.chitante) {
          const restantaChitanta = chitantaVeche.sumaTotal
          const platiChitanta = await db.plata.aggregate({
            where: {
              chitantaId: chitantaVeche.id,
              status: 'CONFIRMED',
            },
            _sum: { suma: true },
          })
          const platit = platiChitanta._sum.suma || 0
          sumaRestanta += restantaChitanta - platit
        }

        // Calculate penalizare
        let sumaPenalizare = 0
        if (sumaRestanta > 0) {
          // Get oldest unpaid chitanta date
          const oldestUnpaid = apt.chitante[apt.chitante.length - 1]
          if (oldestUnpaid) {
            const daysLate = Math.floor(
              (Date.now() - oldestUnpaid.dataScadenta.getTime()) / (1000 * 60 * 60 * 24)
            )
            sumaPenalizare = calculatePenalty(sumaRestanta, daysLate, asociatie.penalizareZi)
          }
        }

        const sumaTotal = sumaIntretinere + sumaRestanta + sumaPenalizare + sumaFonduri

        chitante.push({
          apartamentId: apt.id,
          numar: numarChitanta++,
          luna,
          an,
          sumaIntretinere: Math.round(sumaIntretinere * 100) / 100,
          sumaRestanta: Math.round(sumaRestanta * 100) / 100,
          sumaPenalizare: Math.round(sumaPenalizare * 100) / 100,
          sumaFonduri: Math.round(sumaFonduri * 100) / 100,
          sumaTotal: Math.round(sumaTotal * 100) / 100,
          detalii,
          dataScadenta,
        })
      }

      return {
        success: true,
        data: {
          chitante,
          totalApartamente: chitante.length,
          totalSuma: chitante.reduce((acc, c) => acc + c.sumaTotal, 0),
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  private getTipContorForCheltuiala(tip: TipCheltuiala): string | null {
    const mapping: Record<TipCheltuiala, string | null> = {
      APA_RECE: 'APA_RECE',
      APA_CALDA: 'APA_CALDA',
      GAZ: 'GAZ',
      CURENT_COMUN: 'CURENT',
      CALDURA: 'CALDURA',
      CANALIZARE: null,
      ASCENSOR: null,
      CURATENIE: null,
      GUNOI: null,
      FOND_RULMENT: null,
      FOND_REPARATII: null,
      ADMINISTRARE: null,
      ALTE_CHELTUIELI: null,
    }
    return mapping[tip]
  }

  private async getTotalConsum(
    asociatieId: string,
    tipContor: string,
    luna: number,
    an: number
  ): Promise<number> {
    const prevLuna = luna === 1 ? 12 : luna - 1
    const prevAn = luna === 1 ? an - 1 : an

    const result = await db.$queryRaw<{ total: number }[]>`
      SELECT
        SUM(ic_current.valoare - COALESCE(ic_prev.valoare, 0)) as total
      FROM "contoare" c
      JOIN "apartamente" a ON c."apartamentId" = a.id
      JOIN "indexuri_contoare" ic_current ON ic_current."contorId" = c.id
        AND ic_current.luna = ${luna} AND ic_current.an = ${an}
      LEFT JOIN "indexuri_contoare" ic_prev ON ic_prev."contorId" = c.id
        AND ic_prev.luna = ${prevLuna} AND ic_prev.an = ${prevAn}
      WHERE a."asociatieId" = ${asociatieId}
        AND c.tip = ${tipContor}::"TipContor"
    `

    return result[0]?.total || 0
  }

  private getDenumireCheltuiala(tip: TipCheltuiala): string {
    const denumiri: Record<TipCheltuiala, string> = {
      APA_RECE: 'Apă rece',
      APA_CALDA: 'Apă caldă',
      CANALIZARE: 'Canalizare',
      GAZ: 'Gaz',
      CURENT_COMUN: 'Curent comun',
      CALDURA: 'Căldură',
      ASCENSOR: 'Ascensor',
      CURATENIE: 'Curățenie',
      GUNOI: 'Gunoi',
      FOND_RULMENT: 'Fond rulment',
      FOND_REPARATII: 'Fond reparații',
      ADMINISTRARE: 'Administrare',
      ALTE_CHELTUIELI: 'Alte cheltuieli',
    }
    return denumiri[tip]
  }
}

export const calculChitantaAgent = new CalculChitantaAgent()
