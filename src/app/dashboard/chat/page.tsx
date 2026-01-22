'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Send,
  Bot,
  User,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Lightbulb,
  HelpCircle,
  Loader2,
  AlertCircle,
  CheckCircle,
  Home,
  FileText,
  CreditCard,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  feedback?: 'positive' | 'negative'
  feedbackText?: string
  intent?: string
}

interface QuickAction {
  icon: React.ReactNode
  label: string
  message: string
}

const quickActions: QuickAction[] = [
  { icon: <FileText className="h-4 w-4" />, label: 'Cum adaug o cheltuială?', message: 'Cum adaug o cheltuială nouă?' },
  { icon: <Home className="h-4 w-4" />, label: 'Cum configurez scările?', message: 'Cum configurez scările blocului?' },
  { icon: <CreditCard className="h-4 w-4" />, label: 'Cum generez chitanțe?', message: 'Cum generez chitanțele lunare?' },
  { icon: <Settings className="h-4 w-4" />, label: 'Setări asociație', message: 'Cum modific setările asociației?' },
]

// Page name mapping for contextual help
function getPageName(page: string | null): string {
  const names: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/dashboard/cladire': 'Clădire',
    '/dashboard/apartamente': 'Apartamente',
    '/dashboard/proprietari': 'Proprietari',
    '/dashboard/cheltuieli': 'Cheltuieli',
    '/dashboard/chitante': 'Chitanțe',
    '/dashboard/incasari': 'Încasări',
    '/dashboard/tichete': 'Sesizări',
    '/dashboard/setari': 'Setări',
  }
  return names[page || ''] || 'aplicație'
}

// Page-specific help content
function getPageHelp(page: string | null): string {
  const help: Record<string, string> = {
    '/dashboard': `**Dashboard** - Aici vezi o prezentare generală:
• Statistici despre apartamente și proprietari
• Alerte importante (restanțe, acțiuni necesare)
• Chitanțele recente`,
    '/dashboard/cladire': `**Clădire** - Configurează asociația:
• Date asociație: nume, CUI, adresă, email, telefon
• Date bancare: cont IBAN și bancă
• Setări: zi scadență, penalizare pe zi
• Gestionare scări: adaugă scările blocului (A, B sau 1, 2)`,
    '/dashboard/apartamente': `**Apartamente** - Gestionează apartamentele:
• Adaugă individual sau în masă (până la 200)
• Setează: număr, etaj, suprafață, camere, persoane, cotă
• Asignează la scară
• Link direct pentru a adăuga proprietar`,
    '/dashboard/proprietari': `**Proprietari** - Gestionează locatarii:
• Adaugă proprietar pentru fiecare apartament
• Email obligatoriu pentru notificări
• Cotă parte pentru coproprietari`,
    '/dashboard/cheltuieli': `**Cheltuieli** - Înregistrează facturile:
• Tipuri: apă, gaz, curent, ascensor, curățenie, gunoi
• Mod repartizare: consum, cotă indiviză, persoane, fix
• Poți atașa imaginea facturii pentru transparență`,
    '/dashboard/chitante': `**Chitanțe** - Generează listele de întreținere:
• Apasă "Generează" pentru luna curentă
• Statusuri: generată, trimisă, plătită, restantă
• Vezi istoricul pe luni`,
    '/dashboard/incasari': `**Încasări** - Înregistrează plățile:
• Selectează chitanța de achitat
• Suma se completează automat
• Metode: numerar, card, transfer
• Statusul chitanței se actualizează`,
    '/dashboard/tichete': `**Sesizări** - Gestionează problemele:
• Vezi sesizările raportate de locatari
• Categorii: defecțiune, curățenie, zgomot, etc.
• Schimbă statusul: deschis → în lucru → rezolvat
• Adaugă comentarii pentru comunicare`,
    '/dashboard/setari': `**Setări** - Configurări cont:
• Editează profilul (nume, telefon)
• Preferințe notificări
• Export date (JSON sau CSV)
• Securitate cont`,
  }
  return help[page || ''] || 'Alege o opțiune sau descrie ce vrei să faci.'
}

// Knowledge base pentru răspunsuri rapide
const knowledgeBase: Record<string, string> = {
  'cheltuiala': `Pentru a adăuga o cheltuială:
1. Mergi la **Cheltuieli** din meniul lateral
2. Apasă butonul **Adaugă Cheltuială**
3. Selectează tipul (apă, gaz, curent, etc.)
4. Introdu suma și modul de repartizare
5. Salvează

Cheltuielile vor fi repartizate automat când generezi chitanțele.`,

  'scara': `Pentru a configura scările blocului:
1. Mergi la **Clădire** din meniul lateral
2. În secțiunea "Scări", apasă **Adaugă scară**
3. Introdu numele scării (A, B sau 1, 2, etc.)
4. Salvează

După ce ai scările configurate, poți asigna apartamentele la scara corespunzătoare.`,

  'chitanta': `Pentru a genera chitanțele lunare:
1. Mergi la **Chitanțe** din meniul lateral
2. Apasă **Generează chitanțe**
3. Selectează luna și anul
4. Verifică că ai toate cheltuielile introduse
5. Apasă **Generează**

Chitanțele vor fi create pentru toate apartamentele pe baza cheltuielilor și modului de repartizare.`,

  'apartament': `Pentru a adăuga apartamente:
1. Mergi la **Apartamente** din meniul lateral
2. Poți adăuga individual sau **în masă**
3. Pentru adăugare în masă: specifică de la nr. X până la nr. Y
4. Asignează la scara corespunzătoare

După adăugare, poți seta proprietarii pentru fiecare apartament.`,

  'proprietar': `Pentru a adăuga un proprietar:
1. Mergi la **Proprietari** din meniul lateral
2. Apasă **Adaugă proprietar**
3. Selectează apartamentul
4. Introdu email-ul și numele proprietarului
5. Salvează

Proprietarul va primi notificări pe email despre chitanțe.`,

  'setari': `Setările asociației se găsesc în:
1. **Clădire** - pentru date asociație, CUI, adresă, cont bancar
2. **Setări** - pentru configurări generale

Poți modifica ziua scadență și procentul de penalizare din pagina Clădire.`,

  'plata': `Pentru a înregistra o plată:
1. Mergi la **Încasări** din meniul lateral
2. Apasă **Înregistrează plată**
3. Selectează chitanța
4. Introdu suma și metoda de plată
5. Salvează

Statusul chitanței se va actualiza automat.`,

  'feedback': `Mulțumim pentru feedback!

Dacă ai o sugestie sau problemă:
- Scrie-mi aici în chat
- Voi transmite echipei de dezvoltare

Feedback-ul tău ne ajută să îmbunătățim aplicația!`,

  'problema': `Îmi pare rău că ai întâmpinat o problemă!

Pentru a te ajuta mai bine, te rog să îmi spui:
1. Ce încercai să faci?
2. Ce mesaj de eroare ai primit?
3. Ce browser folosești?

Voi transmite problema echipei tehnice.`,
}

function findBestAnswer(message: string): { answer: string; intent: string } | null {
  const lowerMessage = message.toLowerCase()

  // Check for keywords
  const keywordMap: [string[], string][] = [
    [['cheltuial', 'factur', 'adaug cheltuial'], 'cheltuiala'],
    [['scar', 'configurez scar', 'bloc'], 'scara'],
    [['chitant', 'genere', 'lista', 'intretinere'], 'chitanta'],
    [['apartament', 'adaug apartament'], 'apartament'],
    [['proprietar', 'locatar', 'chirias'], 'proprietar'],
    [['setar', 'configurar', 'modific'], 'setari'],
    [['plat', 'incas', 'achit', 'inregistr'], 'plata'],
    [['feedback', 'sugestie', 'imbunatatire', 'parere'], 'feedback'],
    [['problem', 'eroare', 'nu merge', 'bug', 'nu functioneaza'], 'problema'],
  ]

  for (const [keywords, intent] of keywordMap) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        return { answer: knowledgeBase[intent], intent }
      }
    }
  }

  return null
}

function ChatPageContent({ fromPage, helpQuery }: { fromPage: string | null; helpQuery: string | null }) {

  const getInitialMessage = () => {
    if (helpQuery) {
      return `Bună! Văd că ai nevoie de ajutor cu pagina **${getPageName(fromPage)}**.

${getPageHelp(fromPage)}

Ai vreo întrebare specifică?`
    }
    return `Bună! Sunt asistentul BlocHub.

Te pot ajuta cu:
• Configurarea clădirii și scărilor
• Adăugarea apartamentelor și proprietarilor
• Gestionarea cheltuielilor și chitanțelor
• Înregistrarea plăților
• Sesizări și comunicarea cu locatarii

Cu ce te pot ajuta astăzi?`
  }

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: getInitialMessage(),
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showFeedbackFor, setShowFeedbackFor] = useState<string | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // First try local knowledge base
      const localAnswer = findBestAnswer(input)

      if (localAnswer) {
        // Use local answer
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: localAnswer.answer,
          timestamp: new Date(),
          intent: localAnswer.intent
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        // Try API (OpenAI)
        const response = await fetch('/api/agents/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: input.trim(),
            conversationHistory: messages.slice(-6).map(m => ({
              role: m.role,
              content: m.content
            })),
            currentPage: fromPage || undefined
          })
        })

        if (response.ok) {
          const data = await response.json()
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.response,
            timestamp: new Date(),
            intent: data.intents?.[0]
          }
          setMessages(prev => [...prev, assistantMessage])
        } else {
          // Fallback response
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `Înțeleg întrebarea ta, dar nu am un răspuns specific pregătit.

Poți încerca:
• Să reformulezi întrebarea
• Să folosești una din acțiunile rapide de mai jos
• Să ne trimiți feedback despre ce funcționalitate ai avea nevoie

Echipa noastră citește toate mesajele și îmbunătățește constant aplicația!`,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, assistantMessage])
        }
      }

      // Log conversation for analytics
      await fetch('/api/chat-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'conversation',
          userMessage: input.trim(),
          intent: localAnswer?.intent || 'unknown'
        })
      }).catch(() => {}) // Silent fail

    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Îmi pare rău, a apărut o eroare. Te rog să încerci din nou sau să ne contactezi direct.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAction = (action: QuickAction) => {
    setInput(action.message)
  }

  const handleFeedback = async (messageId: string, type: 'positive' | 'negative') => {
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, feedback: type } : m
    ))

    if (type === 'negative') {
      setShowFeedbackFor(messageId)
    } else {
      // Log positive feedback
      await fetch('/api/chat-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'feedback',
          messageId,
          feedback: 'positive',
          messageContent: messages.find(m => m.id === messageId)?.content
        })
      }).catch(() => {})
    }
  }

  const submitFeedbackText = async (messageId: string) => {
    if (!feedbackText.trim()) {
      setShowFeedbackFor(null)
      return
    }

    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, feedbackText: feedbackText.trim() } : m
    ))

    // Log negative feedback with text
    await fetch('/api/chat-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'feedback',
          messageId,
          feedback: 'negative',
          feedbackText: feedbackText.trim(),
          messageContent: messages.find(m => m.id === messageId)?.content
        })
      }).catch(() => {})

    setShowFeedbackFor(null)
    setFeedbackText('')

    // Thank the user
    const thankMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Mulțumesc pentru feedback! Am înregistrat sugestia ta și echipa de dezvoltare o va analiza.',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, thankMessage])
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Asistent BlocHub</h1>
          <p className="text-sm text-gray-500">Întreabă orice despre administrarea blocului</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white rounded-xl border p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={cn(
            'flex gap-3',
            message.role === 'user' ? 'justify-end' : 'justify-start'
          )}>
            {message.role === 'assistant' && (
              <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-blue-600" />
              </div>
            )}

            <div className={cn(
              'max-w-[80%] rounded-xl p-3',
              message.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900'
            )}>
              <div className="whitespace-pre-wrap text-sm">{message.content}</div>

              {/* Feedback buttons for assistant messages */}
              {message.role === 'assistant' && message.id !== '1' && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  {!message.feedback ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>A fost util?</span>
                      <button
                        onClick={() => handleFeedback(message.id, 'positive')}
                        className="p-1 hover:bg-green-100 rounded transition-colors"
                      >
                        <ThumbsUp className="h-3.5 w-3.5 hover:text-green-600" />
                      </button>
                      <button
                        onClick={() => handleFeedback(message.id, 'negative')}
                        className="p-1 hover:bg-red-100 rounded transition-colors"
                      >
                        <ThumbsDown className="h-3.5 w-3.5 hover:text-red-600" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs">
                      {message.feedback === 'positive' ? (
                        <>
                          <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-green-600">Mulțumim!</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3.5 w-3.5 text-orange-600" />
                          <span className="text-orange-600">
                            {message.feedbackText ? 'Feedback înregistrat' : 'Ne pare rău'}
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Feedback text input */}
                  {showFeedbackFor === message.id && (
                    <div className="mt-2 space-y-2">
                      <Input
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Ce ar fi trebuit să răspund?"
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowFeedbackFor(null)}
                        >
                          Anulează
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => submitFeedbackText(message.id)}
                        >
                          Trimite
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {message.role === 'user' && (
              <div className="h-8 w-8 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Bot className="h-4 w-4 text-blue-600" />
            </div>
            <div className="bg-gray-100 rounded-xl p-3">
              <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
        {quickActions.map((action, i) => (
          <button
            key={i}
            onClick={() => handleQuickAction(action)}
            className="flex items-center gap-2 px-3 py-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap text-sm"
          >
            {action.icon}
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2 mt-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Scrie un mesaj..."
          disabled={loading}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={loading || !input.trim()}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Feedback prompt */}
      <div className="text-center mt-3 text-xs text-gray-400">
        Feedback-ul tău ne ajută să îmbunătățim aplicația
      </div>
    </div>
  )
}

function ChatPageWrapper() {
  const searchParams = useSearchParams()
  const fromPage = searchParams.get('from')
  const helpQuery = searchParams.get('help')

  return <ChatPageContent fromPage={fromPage} helpQuery={helpQuery} />
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Asistent BlocHub</h1>
            <p className="text-sm text-gray-500">Se încarcă...</p>
          </div>
        </div>
        <div className="flex-1 bg-white rounded-xl border p-4 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    }>
      <ChatPageWrapper />
    </Suspense>
  )
}
