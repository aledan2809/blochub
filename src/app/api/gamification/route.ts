import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db as prisma } from '@/lib/db'
import { calculateGamification } from '@/lib/gamification/engine'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    // Find user's active association
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        asociatiiAdmin: { take: 1, select: { id: true } },
        apartamente: {
          where: { esteActiv: true },
          include: { apartament: { select: { asociatieId: true } } },
          take: 1,
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilizator negăsit' }, { status: 404 })
    }

    const asociatieId =
      user.asociatiiAdmin[0]?.id ??
      user.apartamente[0]?.apartament?.asociatieId

    if (!asociatieId) {
      // No association yet - return empty state
      return NextResponse.json({
        totalScore: 0,
        maxScore: 1000,
        level: 'Incepator',
        levelProgress: 0,
        levelIcon: '🏠',
        levelColor: '#f59e0b',
        pillars: [],
        achievements: [],
        setupSteps: [],
        setupProgress: 0,
        newAchievements: [],
        tips: ['Creează sau alătură-te unei asociații pentru a începe.'],
      })
    }

    const result = await calculateGamification(userId, asociatieId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Gamification error:', error)
    return NextResponse.json({ error: 'Eroare la calculul gamificării' }, { status: 500 })
  }
}
