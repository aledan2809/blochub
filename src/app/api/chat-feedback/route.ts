import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = await request.json()

    // Log to console for now - will be stored in DB later
    console.log('Chat Feedback:', {
      userId: session?.user ? (session.user as { id: string }).id : 'anonymous',
      timestamp: new Date().toISOString(),
      ...body
    })

    // Store feedback in database
    if (session?.user && body.type === 'feedback') {
      const userId = (session.user as { id: string }).id

      // Get user's association
      const asociatie = await db.asociatie.findFirst({
        where: { adminId: userId }
      })

      // Log as agent activity for analytics
      await db.agentLog.create({
        data: {
          agentType: 'CHATBOT',
          input: JSON.stringify({
            type: body.type,
            feedback: body.feedback,
            feedbackText: body.feedbackText || null,
            messageContent: body.messageContent?.slice(0, 500) // Truncate
          }),
          output: JSON.stringify({
            recorded: true,
            timestamp: new Date().toISOString()
          }),
          success: true,
          durationMs: 0,
          asociatieId: asociatie?.id || null,
          userId
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Feedback error:', error)
    // Don't fail - feedback is not critical
    return NextResponse.json({ success: true })
  }
}

// GET - retrieve feedback for admin dashboard (future use)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id

    // Check if user is admin of any association
    const asociatie = await db.asociatie.findFirst({
      where: { adminId: userId }
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Nu ești administrator' }, { status: 403 })
    }

    // Get recent chat feedback
    const feedbackLogs = await db.agentLog.findMany({
      where: {
        agentType: 'CHATBOT',
        asociatieId: asociatie.id
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    // Parse and format feedback
    const feedback = feedbackLogs.map(log => {
      try {
        const input = JSON.parse(log.input)
        return {
          id: log.id,
          type: input.type,
          feedback: input.feedback,
          feedbackText: input.feedbackText,
          messageContent: input.messageContent,
          createdAt: log.createdAt
        }
      } catch {
        return null
      }
    }).filter(Boolean)

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error('Get feedback error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
