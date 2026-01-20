import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id

    // Get user's association
    const asociatie = await db.asociatie.findFirst({
      where: { adminId: userId },
      include: {
        _count: {
          select: {
            apartamente: true,
          }
        }
      }
    })

    if (!asociatie) {
      return NextResponse.json({
        hasAsociatie: false,
        stats: null,
        alerteAI: [],
        chitanteRecente: [],
        agentActivity: []
      })
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Get all stats in parallel
    const [
      totalApartamente,
      totalProprietari,
      incasariLuna,
      cheltuieliLuna,
      restanteData,
      fondRulmentData,
      chitanteRecente,
      agentLogsCount,
      predictiiRisc
    ] = await Promise.all([
      // Total apartments
      db.apartament.count({
        where: { asociatieId: asociatie.id }
      }),

      // Total active owners
      db.proprietarApartament.count({
        where: {
          apartament: { asociatieId: asociatie.id },
          esteActiv: true
        }
      }),

      // Monthly income (confirmed payments)
      db.plata.aggregate({
        where: {
          apartament: { asociatieId: asociatie.id },
          status: 'CONFIRMED',
          dataPlata: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        },
        _sum: { suma: true }
      }),

      // Monthly expenses
      db.cheltuiala.aggregate({
        where: {
          asociatieId: asociatie.id,
          luna: now.getMonth() + 1,
          an: now.getFullYear()
        },
        _sum: { suma: true }
      }),

      // Arrears (unpaid invoices)
      db.chitanta.aggregate({
        where: {
          asociatieId: asociatie.id,
          status: { in: ['RESTANTA', 'GENERATA', 'TRIMISA'] },
          dataScadenta: { lt: now }
        },
        _sum: { sumaTotal: true },
        _count: true
      }),

      // Fund balance
      db.fond.aggregate({
        where: {
          asociatieId: asociatie.id,
          tip: 'RULMENT'
        },
        _sum: { soldCurent: true }
      }),

      // Recent invoices
      db.chitanta.findMany({
        where: { asociatieId: asociatie.id },
        include: {
          apartament: { select: { numar: true } },
          plati: { select: { suma: true, status: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),

      // Agent activity (last 24h)
      db.agentLog.groupBy({
        by: ['agentType'],
        where: {
          asociatieId: asociatie.id,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        },
        _count: true
      }),

      // High risk predictions
      db.predictieRestanta.count({
        where: {
          asociatieId: asociatie.id,
          probabilitate: { gte: 80 },
          luna: now.getMonth() + 1,
          an: now.getFullYear()
        }
      })
    ])

    // Calculate payment status for recent invoices
    const chitanteFormatted = chitanteRecente.map(ch => {
      const totalPaid = ch.plati
        .filter(p => p.status === 'CONFIRMED')
        .reduce((sum, p) => sum + p.suma, 0)

      let status: 'platit' | 'partial' | 'neplatit' = 'neplatit'
      if (totalPaid >= ch.sumaTotal) {
        status = 'platit'
      } else if (totalPaid > 0) {
        status = 'partial'
      }

      return {
        apartament: ch.apartament.numar,
        suma: ch.sumaTotal,
        status
      }
    })

    // Format agent activity
    const agentNames: Record<string, string> = {
      'OCR_FACTURA': 'OCR Facturi',
      'OCR_INDEX': 'OCR Indexuri',
      'CALCUL_CHITANTA': 'Calcul Chitanțe',
      'PREDICTIE_PLATA': 'Predicție Plăți',
      'CHATBOT': 'Chatbot',
      'RECONCILIERE': 'Reconciliere',
      'REMINDER': 'Remindere Auto',
      'RAPORT': 'Rapoarte'
    }

    const agentActivity = agentLogsCount.map(log => ({
      agent: agentNames[log.agentType] || log.agentType,
      actiuni: log._count,
      ultimaRulare: 'recent'
    }))

    // Generate AI alerts based on real data
    const alerteAI = []

    if (predictiiRisc > 0) {
      alerteAI.push({
        tip: 'warning',
        mesaj: `${predictiiRisc} apartamente au risc înalt de întârziere (>80%)`,
        actiune: 'Trimite remindere'
      })
    }

    if (restanteData._count > 0) {
      alerteAI.push({
        tip: 'danger',
        mesaj: `${restanteData._count} chitanțe restante - total ${restanteData._sum.sumaTotal?.toFixed(0) || 0} lei`,
        actiune: 'Vezi restanțe'
      })
    }

    // Check for upcoming due dates
    const upcomingDue = await db.cheltuiala.findFirst({
      where: {
        asociatieId: asociatie.id,
        dataScadenta: {
          gte: now,
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      },
      include: { furnizor: true }
    })

    if (upcomingDue) {
      alerteAI.push({
        tip: 'info',
        mesaj: `Factură ${upcomingDue.furnizor?.nume || upcomingDue.tip} scadentă în curând`,
        actiune: 'Plătește acum'
      })
    }

    return NextResponse.json({
      hasAsociatie: true,
      asociatie: {
        id: asociatie.id,
        nume: asociatie.nume
      },
      stats: {
        totalApartamente,
        totalProprietari,
        incasariLuna: incasariLuna._sum.suma || 0,
        cheltuieliLuna: cheltuieliLuna._sum.suma || 0,
        restante: restanteData._sum.sumaTotal || 0,
        restanteCount: restanteData._count,
        fondRulment: fondRulmentData._sum.soldCurent || 0
      },
      alerteAI,
      chitanteRecente: chitanteFormatted,
      agentActivity
    })

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Eroare la încărcarea datelor' },
      { status: 500 }
    )
  }
}
