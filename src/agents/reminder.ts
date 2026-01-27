import { AgentType, TipNotificare } from '@prisma/client'
import { BaseAgent, AgentInput, AgentOutput } from './base'
import { db } from '@/lib/db'
import { formatCurrency, formatMonth, getDaysUntilDue, calculatePenalty } from '@/lib/utils'

interface ReminderResult {
  userId: string
  email: string
  phone?: string
  apartament: string
  suma: number
  penalizare: number
  totalCuPenalizare: number
  tipReminder: 'BEFORE_DUE' | 'ON_DUE' | 'AFTER_DUE'
  zileRamase: number
  mesaj: string
}

export class ReminderAgent extends BaseAgent {
  type = AgentType.REMINDER
  name = 'Reminder Agent'
  description = 'Trimite automat remindere pentru plăți către proprietari'

  protected async execute(input: AgentInput): Promise<AgentOutput> {
    const { asociatieId, dryRun = false } = input

    try {
      // Get all unpaid chitante
      const chitanteQuery: any = {
        status: { in: ['GENERATA', 'TRIMISA', 'PARTIAL_PLATITA'] },
      }

      if (asociatieId) {
        chitanteQuery.asociatieId = asociatieId
      }

      const chitante = await db.chitanta.findMany({
        where: chitanteQuery,
        include: {
          apartament: {
            include: {
              proprietari: {
                where: { esteActiv: true },
                include: {
                  user: true,
                },
              },
            },
          },
          asociatie: true,
          plati: {
            where: { status: 'CONFIRMED' },
          },
        },
      })

      const reminders: ReminderResult[] = []
      const now = new Date()

      for (const chitanta of chitante) {
        // Calculate remaining amount
        const platit = chitanta.plati.reduce((sum, p) => sum + p.suma, 0)
        const restDePlata = chitanta.sumaTotal - platit

        if (restDePlata <= 0) continue

        const zileRamase = getDaysUntilDue(chitanta.dataScadenta)

        // Determine reminder type and if should send
        let shouldSend = false
        let tipReminder: 'BEFORE_DUE' | 'ON_DUE' | 'AFTER_DUE'

        if (zileRamase > 0 && zileRamase <= 7) {
          // 7 days before due
          tipReminder = 'BEFORE_DUE'
          shouldSend = zileRamase === 7 || zileRamase === 3 || zileRamase === 1
        } else if (zileRamase === 0) {
          // On due date
          tipReminder = 'ON_DUE'
          shouldSend = true
        } else if (zileRamase < 0) {
          // After due date
          tipReminder = 'AFTER_DUE'
          const daysLate = Math.abs(zileRamase)
          shouldSend = daysLate === 1 || daysLate === 7 || daysLate === 14 || daysLate % 30 === 0
        } else {
          continue // More than 7 days until due
        }

        if (!shouldSend) continue

        // Calculate penalty for late payments
        let penalizare = 0
        if (tipReminder === 'AFTER_DUE') {
          const daysLate = Math.abs(zileRamase)
          // penalizareZi is stored as percentage (e.g., 0.02 = 0.02%)
          // Convert to rate by dividing by 100
          penalizare = calculatePenalty(restDePlata, daysLate, chitanta.asociatie.penalizareZi / 100)
        }
        const totalCuPenalizare = restDePlata + penalizare

        // Get proprietari
        for (const proprietarRel of chitanta.apartament.proprietari) {
          const user = proprietarRel.user

          // Generate message based on type
          const mesaj = this.generateMessage(
            tipReminder,
            user.name || 'Stimate proprietar',
            chitanta.apartament.numar,
            chitanta.luna,
            chitanta.an,
            restDePlata,
            zileRamase,
            chitanta.asociatie.nume,
            penalizare,
            chitanta.asociatie.penalizareZi
          )

          reminders.push({
            userId: user.id,
            email: user.email,
            phone: user.phone || undefined,
            apartament: chitanta.apartament.numar,
            suma: restDePlata,
            penalizare,
            totalCuPenalizare,
            tipReminder,
            zileRamase,
            mesaj,
          })

          // Create notification in database
          if (!dryRun) {
            await db.notificare.create({
              data: {
                tip: TipNotificare.REMINDER_PLATA,
                titlu: this.getReminderTitle(tipReminder, zileRamase),
                mesaj,
                userId: user.id,
              },
            })
          }
        }
      }

      // Group by type for summary
      const byType = {
        BEFORE_DUE: reminders.filter((r) => r.tipReminder === 'BEFORE_DUE').length,
        ON_DUE: reminders.filter((r) => r.tipReminder === 'ON_DUE').length,
        AFTER_DUE: reminders.filter((r) => r.tipReminder === 'AFTER_DUE').length,
      }

      return {
        success: true,
        data: {
          reminders,
          summary: {
            total: reminders.length,
            byType,
            totalSuma: reminders.reduce((sum, r) => sum + r.suma, 0),
          },
          dryRun,
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  private generateMessage(
    tip: 'BEFORE_DUE' | 'ON_DUE' | 'AFTER_DUE',
    nume: string,
    apartament: string,
    luna: number,
    an: number,
    suma: number,
    zile: number,
    asociatie: string,
    penalizare: number = 0,
    penalizareZi: number = 0.02
  ): string {
    const lunaFormatata = formatMonth(luna, an)
    const sumaFormatata = formatCurrency(suma)

    switch (tip) {
      case 'BEFORE_DUE':
        return `Bună ziua, ${nume}!

Vă reamintim că întreținerea pentru ${lunaFormatata} la apartamentul ${apartament} din ${asociatie} are scadența în ${zile} ${zile === 1 ? 'zi' : 'zile'}.

Suma de plată: ${sumaFormatata}

Puteți plăti online în contul dvs. BlocHub pentru a evita penalitățile.

Cu respect,
Echipa BlocHub`

      case 'ON_DUE':
        return `Bună ziua, ${nume}!

Astăzi este ultima zi pentru plata întreținerii pentru ${lunaFormatata} la apartamentul ${apartament}.

Suma de plată: ${sumaFormatata}

Vă rugăm să efectuați plata astăzi pentru a evita penalitățile de întârziere.

Cu respect,
Echipa BlocHub`

      case 'AFTER_DUE':
        const zileLate = Math.abs(zile)
        const penalizareFormatata = formatCurrency(penalizare)
        const totalFormatat = formatCurrency(suma + penalizare)
        return `Bună ziua, ${nume}!

Întreținerea pentru ${lunaFormatata} la apartamentul ${apartament} este restantă de ${zileLate} ${zileLate === 1 ? 'zi' : 'zile'}.

📋 Detalii plată:
• Suma restantă: ${sumaFormatata}
• Penalizare (${penalizareZi}% × ${zileLate} zile): ${penalizareFormatata}
• TOTAL DE PLATĂ: ${totalFormatat}

⚠️ Penalizările cresc zilnic cu ${penalizareZi}% din suma restantă.

Vă rugăm să efectuați plata cât mai curând posibil pentru a evita acumularea de penalizări suplimentare.

Cu respect,
Echipa BlocHub`
    }
  }

  private getReminderTitle(tip: 'BEFORE_DUE' | 'ON_DUE' | 'AFTER_DUE', zile: number): string {
    switch (tip) {
      case 'BEFORE_DUE':
        return `Reminder: Scadență în ${zile} ${zile === 1 ? 'zi' : 'zile'}`
      case 'ON_DUE':
        return 'Reminder: Scadență astăzi!'
      case 'AFTER_DUE':
        return `Atenție: Restanță de ${Math.abs(zile)} zile`
    }
  }
}

export const reminderAgent = new ReminderAgent()
