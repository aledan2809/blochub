import { AgentType, TipNotificare, ReminderType, ReminderChannel } from '@prisma/client'
import { BaseAgent, AgentInput, AgentOutput } from './base'
import { db } from '@/lib/db'
import { formatCurrency, formatMonth, getDaysUntilDue, calculatePenalty } from '@/lib/utils'
import { sendEmail, emailTemplates } from '@/lib/email'

interface ReminderResult {
  userId: string
  email: string
  phone?: string
  apartament: string
  apartamentId: string
  chitantaId: string
  asociatieId: string
  suma: number
  penalizare: number
  totalCuPenalizare: number
  tipReminder: ReminderType
  zileRamase: number
  mesaj: string
  emailSent: boolean
  historyId?: string
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
        let tipReminder: ReminderType

        if (zileRamase > 0 && zileRamase <= 7) {
          // 7 days before due
          tipReminder = ReminderType.BEFORE_DUE
          shouldSend = zileRamase === 7 || zileRamase === 3 || zileRamase === 1
        } else if (zileRamase === 0) {
          // On due date
          tipReminder = ReminderType.ON_DUE
          shouldSend = true
        } else if (zileRamase < 0) {
          // After due date
          tipReminder = ReminderType.AFTER_DUE
          const daysLate = Math.abs(zileRamase)
          // Escalation: more frequent reminders for longer delays
          if (daysLate <= 7) {
            shouldSend = true // Daily for first week
          } else if (daysLate <= 14) {
            shouldSend = daysLate % 2 === 0 // Every 2 days for second week
          } else if (daysLate <= 30) {
            shouldSend = daysLate % 7 === 0 // Weekly for first month
          } else {
            shouldSend = daysLate % 14 === 0 // Bi-weekly after first month
          }
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

        // Check if we already sent a reminder today for this chitanta
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const existingReminder = await db.reminderHistory.findFirst({
          where: {
            chitantaId: chitanta.id,
            trimisLa: { gte: today },
          },
        })

        if (existingReminder) {
          continue // Already sent reminder today
        }

        // Get proprietari
        for (const proprietarRel of chitanta.apartament.proprietari) {
          const user = proprietarRel.user

          // Skip if no valid email
          if (!user.email || user.email.includes('@placeholder.local')) {
            continue
          }

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

          let emailSent = false
          let historyId: string | undefined

          // Send email if not dry run
          if (!dryRun) {
            try {
              // Use appropriate email template based on reminder type
              const isRestanta = tipReminder === ReminderType.AFTER_DUE
              const emailData = isRestanta
                ? emailTemplates.restantaNotification({
                    nume: user.name || 'Stimate proprietar',
                    apartament: chitanta.apartament.numar,
                    sumaRestanta: restDePlata,
                    penalizare,
                    totalDePlata: totalCuPenalizare,
                    zileLate: Math.abs(zileRamase),
                    penalizareZi: chitanta.asociatie.penalizareZi,
                    asociatie: chitanta.asociatie.nume,
                    link: `${process.env.NEXTAUTH_URL || 'https://app.blochub.ro'}/plata/${chitanta.id}`,
                  })
                : emailTemplates.paymentReminder({
                    nume: user.name || 'Stimate proprietar',
                    apartament: chitanta.apartament.numar,
                    suma: restDePlata,
                    scadenta: chitanta.dataScadenta.toLocaleDateString('ro-RO'),
                    link: `${process.env.NEXTAUTH_URL || 'https://app.blochub.ro'}/plata/${chitanta.id}`,
                  })

              const result = await sendEmail({
                to: user.email,
                subject: emailData.subject,
                html: emailData.html,
                asociatieId: chitanta.asociatieId,
              })

              emailSent = result.success
            } catch (error) {
              console.error(`[ReminderAgent] Email error for ${user.email}:`, error)
            }

            // Create notification in database
            await db.notificare.create({
              data: {
                tip: TipNotificare.REMINDER_PLATA,
                titlu: this.getReminderTitle(tipReminder, zileRamase),
                mesaj,
                userId: user.id,
              },
            })

            // Track in reminder history
            const history = await db.reminderHistory.create({
              data: {
                tip: tipReminder,
                canal: ReminderChannel.EMAIL,
                mesaj,
                apartamentId: chitanta.apartamentId,
                chitantaId: chitanta.id,
                asociatieId: chitanta.asociatieId,
              },
            })
            historyId = history.id
          }

          reminders.push({
            userId: user.id,
            email: user.email,
            phone: user.phone || undefined,
            apartament: chitanta.apartament.numar,
            apartamentId: chitanta.apartamentId,
            chitantaId: chitanta.id,
            asociatieId: chitanta.asociatieId,
            suma: restDePlata,
            penalizare,
            totalCuPenalizare,
            tipReminder,
            zileRamase,
            mesaj,
            emailSent,
            historyId,
          })
        }
      }

      // Group by type for summary
      const byType = {
        BEFORE_DUE: reminders.filter((r) => r.tipReminder === ReminderType.BEFORE_DUE).length,
        ON_DUE: reminders.filter((r) => r.tipReminder === ReminderType.ON_DUE).length,
        AFTER_DUE: reminders.filter((r) => r.tipReminder === ReminderType.AFTER_DUE).length,
      }
      const emailsSent = reminders.filter((r) => r.emailSent).length

      return {
        success: true,
        data: {
          reminders,
          summary: {
            total: reminders.length,
            emailsSent,
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
    tip: ReminderType,
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
      case ReminderType.BEFORE_DUE:
        return `Bună ziua, ${nume}!

Vă reamintim că întreținerea pentru ${lunaFormatata} la apartamentul ${apartament} din ${asociatie} are scadența în ${zile} ${zile === 1 ? 'zi' : 'zile'}.

Suma de plată: ${sumaFormatata}

Puteți plăti online în contul dvs. BlocHub pentru a evita penalitățile.

Cu respect,
Echipa BlocHub`

      case ReminderType.ON_DUE:
        return `Bună ziua, ${nume}!

Astăzi este ultima zi pentru plata întreținerii pentru ${lunaFormatata} la apartamentul ${apartament}.

Suma de plată: ${sumaFormatata}

Vă rugăm să efectuați plata astăzi pentru a evita penalitățile de întârziere.

Cu respect,
Echipa BlocHub`

      case ReminderType.AFTER_DUE:
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

      default:
        return `Bună ziua, ${nume}!

Vă notificăm cu privire la plata întreținerii pentru ${lunaFormatata} la apartamentul ${apartament}.

Suma de plată: ${sumaFormatata}

Cu respect,
Echipa BlocHub`
    }
  }

  private getReminderTitle(tip: ReminderType, zile: number): string {
    switch (tip) {
      case ReminderType.BEFORE_DUE:
        return `Reminder: Scadență în ${zile} ${zile === 1 ? 'zi' : 'zile'}`
      case ReminderType.ON_DUE:
        return 'Reminder: Scadență astăzi!'
      case ReminderType.AFTER_DUE:
        return `Atenție: Restanță de ${Math.abs(zile)} zile`
      case ReminderType.ESCALATION:
        return `⚠️ URGENT: Restanță de ${Math.abs(zile)} zile`
      case ReminderType.WEEKLY_SUMMARY:
        return 'Rezumat săptămânal restanțe'
      default:
        return 'Notificare plată'
    }
  }
}

export const reminderAgent = new ReminderAgent()
