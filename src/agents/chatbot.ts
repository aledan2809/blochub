import { AgentType } from '@prisma/client'
import { BaseAgent, AgentInput, AgentOutput } from './base'
import { db } from '@/lib/db'
import OpenAI from 'openai'
import { formatCurrency, formatMonth } from '@/lib/utils'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export class ChatbotAgent extends BaseAgent {
  type = AgentType.CHATBOT
  name = 'Chatbot Agent'
  description = 'Răspunde la întrebări despre chitanțe, plăți, consum și documente'

  protected async execute(input: AgentInput): Promise<AgentOutput> {
    const { message, userId, apartamentId, conversationHistory } = input

    if (!message) {
      return {
        success: false,
        error: 'Message required',
      }
    }

    try {
      // Get user context
      let context = ''

      if (userId) {
        const user = await db.user.findUnique({
          where: { id: userId },
          include: {
            apartamente: {
              where: { esteActiv: true },
              include: {
                apartament: {
                  include: {
                    asociatie: true,
                    chitante: {
                      orderBy: { createdAt: 'desc' },
                      take: 3,
                      include: {
                        plati: true,
                      },
                    },
                    contoare: {
                      include: {
                        indexuri: {
                          orderBy: { dataIndex: 'desc' },
                          take: 2,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        })

        if (user && user.apartamente.length > 0) {
          const apt = apartamentId
            ? user.apartamente.find((a) => a.apartamentId === apartamentId)?.apartament
            : user.apartamente[0].apartament

          if (apt) {
            // Build context from user data
            context = this.buildContext(user.name || 'Utilizator', apt)
          }
        }
      }

      // Build conversation
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: `Ești asistentul virtual BlocHub, specializat în administrarea asociațiilor de proprietari din România.

Răspunzi la întrebări despre:
- Chitanțe și sume de plată
- Istoric plăți și restanțe
- Indexuri contoare (apă, gaz, etc.)
- Documente asociație (AVG, regulamente)
- Anunțuri și notificări

Reguli:
1. Răspunde ÎNTOTDEAUNA în limba română
2. Fii concis și la obiect
3. Dacă nu ai informații, spune că nu poți răspunde
4. Pentru plăți, oferă link-ul de plată
5. Pentru probleme tehnice, recomandă contactarea administratorului
6. Sumele să fie în format românesc (ex: 520 lei)

${context ? `\nContext utilizator:\n${context}` : ''}`,
        },
      ]

      // Add conversation history
      if (conversationHistory && Array.isArray(conversationHistory)) {
        messages.push(...conversationHistory.slice(-10)) // Last 10 messages
      }

      messages.push({
        role: 'user',
        content: message,
      })

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Use cheaper model for chat
        messages,
        max_tokens: 500,
        temperature: 0.7,
      })

      const assistantMessage = response.choices[0]?.message?.content

      if (!assistantMessage) {
        return {
          success: false,
          error: 'No response from AI',
        }
      }

      // Detect intents for quick actions
      const intents = this.detectIntents(message.toLowerCase())

      return {
        success: true,
        data: {
          response: assistantMessage,
          intents,
          tokensUsed: response.usage?.total_tokens,
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  private buildContext(userName: string, apt: any): string {
    const lines: string[] = []

    lines.push(`Utilizator: ${userName}`)
    lines.push(`Apartament: ${apt.numar}`)
    lines.push(`Asociație: ${apt.asociatie.nume}`)
    lines.push(`Adresă: ${apt.asociatie.adresa}, ${apt.asociatie.oras}`)

    // Last chitante
    if (apt.chitante.length > 0) {
      lines.push('\nUltimele chitanțe:')
      for (const chitanta of apt.chitante) {
        const platit = chitanta.plati
          .filter((p: any) => p.status === 'CONFIRMED')
          .reduce((sum: number, p: any) => sum + p.suma, 0)
        const restDePlata = chitanta.sumaTotal - platit
        const status = restDePlata <= 0 ? 'PLĂTIT' : `De plată: ${formatCurrency(restDePlata)}`

        lines.push(
          `- ${formatMonth(chitanta.luna, chitanta.an)}: ${formatCurrency(chitanta.sumaTotal)} (${status})`
        )
      }

      // Calculate total debt
      const totalRestanta = apt.chitante.reduce((total: number, c: any) => {
        const platit = c.plati
          .filter((p: any) => p.status === 'CONFIRMED')
          .reduce((sum: number, p: any) => sum + p.suma, 0)
        return total + Math.max(0, c.sumaTotal - platit)
      }, 0)

      if (totalRestanta > 0) {
        lines.push(`\nRestanță totală: ${formatCurrency(totalRestanta)}`)
      }
    }

    // Contoare
    if (apt.contoare.length > 0) {
      lines.push('\nContoare:')
      for (const contor of apt.contoare) {
        if (contor.indexuri.length > 0) {
          const lastIndex = contor.indexuri[0]
          lines.push(`- ${contor.tip}: ${lastIndex.valoare} (${formatMonth(lastIndex.luna, lastIndex.an)})`)
        }
      }
    }

    return lines.join('\n')
  }

  private detectIntents(message: string): string[] {
    const intents: string[] = []

    const intentPatterns = [
      { pattern: /plat(esc|a|i)|achit/i, intent: 'PAYMENT' },
      { pattern: /chitan(ta|te)/i, intent: 'VIEW_CHITANTA' },
      { pattern: /cat|suma|de plata/i, intent: 'VIEW_BALANCE' },
      { pattern: /index|contor/i, intent: 'VIEW_INDEX' },
      { pattern: /istoric|plati anterioare/i, intent: 'VIEW_HISTORY' },
      { pattern: /document|avg|regulament/i, intent: 'VIEW_DOCUMENTS' },
      { pattern: /contact|administrator/i, intent: 'CONTACT_ADMIN' },
      { pattern: /anunt|noutati/i, intent: 'VIEW_ANNOUNCEMENTS' },
    ]

    for (const { pattern, intent } of intentPatterns) {
      if (pattern.test(message)) {
        intents.push(intent)
      }
    }

    return intents
  }
}

export const chatbotAgent = new ChatbotAgent()
