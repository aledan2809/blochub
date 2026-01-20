import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { runAgent } from '@/agents'

const chatSchema = z.object({
  message: z.string().min(1, 'Mesajul este obligatoriu'),
  apartamentId: z.string().optional(),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional(),
})

// POST chat with AI
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = chatSchema.parse(body)

    const result = await runAgent(
      'CHATBOT',
      {
        message: data.message,
        userId: (session.user as any).id,
        apartamentId: data.apartamentId,
        conversationHistory: data.conversationHistory,
      },
      {
        userId: (session.user as any).id,
      }
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to process message' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      response: result.data.response,
      intents: result.data.intents,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error in chat:', error)
    return NextResponse.json({ error: 'Failed to process chat' }, { status: 500 })
  }
}
