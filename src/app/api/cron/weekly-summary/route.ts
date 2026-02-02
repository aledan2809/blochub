import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendEmail, emailTemplates } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Get all associations with their admins
    const asociatii = await db.asociatie.findMany({
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    let sentCount = 0
    let errorCount = 0

    for (const asociatie of asociatii) {
      if (!asociatie.admin?.email) continue

      try {
        // Get payments from last week
        const platiSaptamana = await db.plata.aggregate({
          where: {
            chitanta: { asociatieId: asociatie.id },
            dataPlata: { gte: oneWeekAgo },
            status: 'CONFIRMED',
          },
          _sum: { suma: true },
          _count: { _all: true },
        })

        // Get current arrears
        const chitanteRestante = await db.chitanta.findMany({
          where: {
            asociatieId: asociatie.id,
            status: { in: ['RESTANTA', 'PARTIAL_PLATITA'] },
          },
          include: {
            apartament: true,
            plati: {
              where: { status: 'CONFIRMED' },
            },
          },
        })

        // Calculate arrears details
        const restanteDetails = chitanteRestante.map((c) => {
          const platit = c.plati.reduce((sum, p) => sum + p.suma, 0)
          const restant = c.sumaTotal - platit
          const zileLate = Math.floor(
            (now.getTime() - c.dataScadenta.getTime()) / (1000 * 60 * 60 * 24)
          )
          return {
            apartament: c.apartament.numar,
            suma: restant,
            zile: zileLate,
          }
        }).filter((r) => r.suma > 0)

        const totalRestante = restanteDetails.length
        const sumaRestante = restanteDetails.reduce((sum, r) => sum + r.suma, 0)

        // Get top 5 arrears
        const topRestantieri = restanteDetails
          .sort((a, b) => b.suma - a.suma)
          .slice(0, 5)

        // Format period
        const perioada = `${oneWeekAgo.toLocaleDateString('ro-RO')} - ${now.toLocaleDateString('ro-RO')}`

        // Generate email
        const emailData = emailTemplates.weeklySummary({
          numeAdmin: asociatie.admin.name || 'Administrator',
          asociatie: asociatie.nume,
          perioada,
          totalRestante,
          sumaRestante,
          chitanteNoi: platiSaptamana._count?._all || 0,
          sumaIncasata: platiSaptamana._sum?.suma || 0,
          topRestantieri,
          link: `${process.env.NEXTAUTH_URL || 'https://app.blochub.ro'}/dashboard`,
        })

        // Send email
        const result = await sendEmail({
          to: asociatie.admin.email,
          subject: emailData.subject,
          html: emailData.html,
          asociatieId: asociatie.id,
        })

        if (result.success) {
          sentCount++
        } else {
          errorCount++
        }

        // Log agent activity
        await db.agentLog.create({
          data: {
            agentType: 'REMINDER',
            input: JSON.stringify({ type: 'WEEKLY_SUMMARY', asociatieId: asociatie.id }),
            output: JSON.stringify({
              totalRestante,
              sumaRestante,
              sumaIncasata: platiSaptamana._sum?.suma || 0,
            }),
            success: result.success,
            durationMs: 0,
            asociatieId: asociatie.id,
          },
        })
      } catch (error) {
        console.error(`[WeeklySummary] Error for ${asociatie.id}:`, error)
        errorCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Weekly summary sent to ${sentCount} associations, ${errorCount} errors`,
      processed: asociatii.length,
    })
  } catch (error) {
    console.error('Cron weekly-summary error:', error)
    return NextResponse.json(
      { error: 'Failed to send weekly summaries' },
      { status: 500 }
    )
  }
}
