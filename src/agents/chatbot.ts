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

// Application knowledge base - real-time documentation
const APP_KNOWLEDGE = `
## BlocHub - Ghid complet pentru administratori

### Flux de lucru recomandat:
1. Configurează clădirea (Clădire) - date asociație, scări
2. Adaugă apartamentele (Apartamente) - individual sau în masă
3. Adaugă proprietarii (Proprietari) - email pentru notificări
4. Lunar: adaugă cheltuieli și generează chitanțe
5. Înregistrează plățile primite (Încasări)

### Pagini și funcționalități:

**Dashboard** - Prezentare generală
- Statistici: apartamente, proprietari, încasări luna curentă
- Alerte AI pentru restanțe și acțiuni necesare
- Chitanțe recente și statusul lor

**Clădire** (/dashboard/cladire)
- Editare date asociație: nume, CUI, adresă, email, telefon
- Date bancare: cont IBAN, bancă
- Setări facturare: zi scadență (implicit 25), penalizare pe zi
- Gestionare scări: adaugă/șterge scări (A, B sau 1, 2, etc.)

**Apartamente** (/dashboard/apartamente)
- Adaugă individual: număr, etaj, suprafață, camere, persoane, cotă
- Adaugă în masă: de la nr. X până la nr. Y (max 200)
- Asignare la scară
- Editare și ștergere
- Link direct pentru adăugare proprietar

**Proprietari** (/dashboard/proprietari)
- Adaugă proprietar: selectează apartament, introdu email și nume
- Email-ul e obligatoriu pentru notificări
- Cotă parte: pentru coproprietari (default 100%)
- Afișare apartamente fără proprietar

**Cheltuieli** (/dashboard/cheltuieli)
- Tipuri: apă rece/caldă, gaz, curent comun, ascensor, curățenie, gunoi, fonduri
- Mod repartizare: consum, cotă indiviză, persoane, fix/apartament
- Filtrare pe lună și an

**Chitanțe** (/dashboard/chitante)
- Generare automată pe baza cheltuielilor
- Statusuri: generată, trimisă, parțial plătită, plătită, restantă
- Istoric pe luni

**Încasări** (/dashboard/incasari)
- Înregistrare plăți: numerar, card, transfer
- Selectează chitanța, suma se completează automat
- Referință/nr. document opțional
- Statusul chitanței se actualizează automat

### Întrebări frecvente:

Q: Cum modific ziua de scadență?
A: Mergi la Clădire > Setări facturare > Zi scadență

Q: Cum adaug mai multe apartamente rapid?
A: Apartamente > Adaugă în masă > specifică de la/până la

Q: Ce înseamnă cotă indiviză?
A: Procentul din suprafața totală a blocului, folosit la repartizare

Q: Cum văd restanțele?
A: Dashboard afișează alertele, sau Chitanțe filtrate pe status

Q: Pot modifica o chitanță generată?
A: Nu direct, dar poți șterge și regenera pentru luna respectivă

### Sugestii pentru feedback:
Utilizatorii pot da feedback pozitiv/negativ la răspunsurile chat-ului.
Feedback-ul negativ cere detalii pentru îmbunătățiri.
Toate conversațiile sunt analizate pentru îmbunătățirea aplicației.
`

// Topics that are allowed (app-related)
const ALLOWED_TOPICS = [
  // Romanian terms
  'asociat', 'bloc', 'apartament', 'proprietar', 'chirias', 'locatar',
  'chitant', 'intretin', 'plat', 'incas', 'restant', 'suma',
  'cheltuiel', 'factur', 'apa', 'gaz', 'curent', 'gunoi', 'ascensor',
  'contor', 'index', 'consum',
  'cladire', 'scar', 'etaj',
  'administrator', 'admin',
  'setar', 'configur', 'modific',
  'adaug', 'sterg', 'edite', 'salvea',
  'raport', 'export', 'tipar', 'print',
  'notific', 'email', 'sms',
  'penaliz', 'scaden', 'termeni',
  'fond', 'rulment', 'reparat',
  'repartiz', 'cota', 'persoana',
  'blochub', 'aplicat', 'sistem', 'platform', 'dashboard',
  'cum', 'unde', 'cand', 'ce', 'de ce', 'ajutor', 'help',
  'eroare', 'problem', 'bug', 'nu merge', 'nu funct',
  'feedback', 'sugestie', 'parere', 'multumesc',
  // Common greetings (allow)
  'buna', 'salut', 'hello', 'salutare', 'servus',
]

// Topics that are blocked (off-topic)
const BLOCKED_TOPICS = [
  'vreme', 'meteo', 'timp afara',
  'sport', 'fotbal', 'meci',
  'politica', 'alegeri', 'partid',
  'reteta', 'gatit', 'mancare',
  'film', 'serial', 'netflix',
  'muzica', 'cantec', 'artist',
  'gluma', 'bancuri',
  'calatorie', 'vacanta', 'bilet avion',
  'dating', 'relatie',
  'cripto', 'bitcoin', 'trading',
  'jocuri', 'games',
  'slabit', 'dieta',
  'horoscop', 'zodii',
]

export class ChatbotAgent extends BaseAgent {
  type = AgentType.CHATBOT
  name = 'Chatbot Agent'
  description = 'Răspunde la întrebări despre chitanțe, plăți, consum și aplicația BlocHub'

  private isOnTopic(message: string): boolean {
    const lowerMessage = message.toLowerCase()

    // Check for blocked topics first
    for (const blocked of BLOCKED_TOPICS) {
      if (lowerMessage.includes(blocked)) {
        return false
      }
    }

    // Check for allowed topics
    for (const allowed of ALLOWED_TOPICS) {
      if (lowerMessage.includes(allowed)) {
        return true
      }
    }

    // Short messages (< 3 words) are likely greetings, allow them
    if (message.split(' ').length < 3) {
      return true
    }

    // Default: allow but with lower confidence (might be app-related)
    return true
  }

  protected async execute(input: AgentInput): Promise<AgentOutput> {
    const { message, userId, apartamentId, conversationHistory, isAdmin } = input

    if (!message) {
      return {
        success: false,
        error: 'Message required',
      }
    }

    // Check if message is on-topic
    if (!this.isOnTopic(message)) {
      return {
        success: true,
        data: {
          response: `Îmi pare rău, dar pot răspunde doar la întrebări despre:
• Administrarea asociației și blocului
• Apartamente și proprietari
• Cheltuieli și chitanțe
• Plăți și încasări
• Utilizarea aplicației BlocHub

Cu ce te pot ajuta în legătură cu administrarea blocului?`,
          intents: ['OFF_TOPIC'],
          tokensUsed: 0,
        },
      }
    }

    try {
      // Get user context
      let userContext = ''
      let adminContext = ''

      if (userId) {
        const user = await db.user.findUnique({
          where: { id: userId },
          include: {
            // Check if user is admin of any association
            asociatiiAdmin: {
              include: {
                _count: {
                  select: {
                    apartamente: true,
                    chitante: true,
                    cheltuieli: true,
                  }
                },
                scari: true,
              },
              take: 1
            },
            // Also check if user is a proprietar
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

        if (user) {
          // Build admin context if user is admin
          if (user.asociatiiAdmin && user.asociatiiAdmin.length > 0) {
            const asociatie = user.asociatiiAdmin[0]
            adminContext = this.buildAdminContext(user.name || 'Administrator', asociatie)
          }
          // Build proprietar context
          else if (user.apartamente.length > 0) {
            const apt = apartamentId
              ? user.apartamente.find((a) => a.apartamentId === apartamentId)?.apartament
              : user.apartamente[0].apartament

            if (apt) {
              userContext = this.buildProprietarContext(user.name || 'Utilizator', apt)
            }
          }
        }
      }

      // Build conversation with app knowledge
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: `Ești asistentul virtual BlocHub, specializat în administrarea asociațiilor de proprietari din România.

${APP_KNOWLEDGE}

REGULI STRICTE:
1. Răspunde ÎNTOTDEAUNA în limba română
2. Fii concis și practic - oferă pași clari
3. Bazează-te pe documentația aplicației de mai sus
4. Dacă utilizatorul raportează o problemă, mulțumește și spune că vei transmite echipei
5. Pentru întrebări în afara aplicației, refuză politicos și redirecționează
6. Sumele în format românesc (ex: 520 lei)
7. Nu inventa funcționalități care nu există
8. Dacă nu știi răspunsul exact, spune că vei verifica și revii

${adminContext ? `\n--- CONTEXT ADMINISTRATOR ---\n${adminContext}` : ''}
${userContext ? `\n--- CONTEXT PROPRIETAR ---\n${userContext}` : ''}`,
        },
      ]

      // Add conversation history
      if (conversationHistory && Array.isArray(conversationHistory)) {
        messages.push(...conversationHistory.slice(-10))
      }

      messages.push({
        role: 'user',
        content: message,
      })

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 600,
        temperature: 0.5, // Lower for more consistent responses
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

  private buildAdminContext(userName: string, asociatie: any): string {
    const lines: string[] = []

    lines.push(`Rol: ADMINISTRATOR`)
    lines.push(`Nume: ${userName}`)
    lines.push(`Asociație: ${asociatie.nume}`)
    lines.push(`Apartamente: ${asociatie._count.apartamente}`)
    lines.push(`Chitanțe generate: ${asociatie._count.chitante}`)
    lines.push(`Cheltuieli înregistrate: ${asociatie._count.cheltuieli}`)
    lines.push(`Scări configurate: ${asociatie.scari?.length || 0}`)

    return lines.join('\n')
  }

  private buildProprietarContext(userName: string, apt: any): string {
    const lines: string[] = []

    lines.push(`Rol: PROPRIETAR`)
    lines.push(`Nume: ${userName}`)
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
