import { NextRequest, NextResponse } from 'next/server'
import { reminderAgent } from '@/agents/reminder'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all associations
    const asociatii = await db.asociatie.findMany({
      select: { id: true, nume: true },
    })

    let totalReminders = 0
    let totalEmails = 0
    let errorCount = 0

    for (const asociatie of asociatii) {
      try {
        // Run the improved reminder agent for each association
        const result = await reminderAgent.run(
          { asociatieId: asociatie.id, dryRun: false },
          { asociatieId: asociatie.id }
        )

        if (result.success && result.data) {
          totalReminders += result.data.summary.total
          totalEmails += result.data.summary.emailsSent
          // Agent already logs activity through BaseAgent.run()
        } else if (!result.success) {
          console.error(`[SendReminders] Error for ${asociatie.nume}:`, result.error)
          errorCount++
        }
      } catch (error) {
        console.error(`[SendReminders] Exception for ${asociatie.id}:`, error)
        errorCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${asociatii.length} associations: ${totalReminders} reminders, ${totalEmails} emails sent, ${errorCount} errors`,
      summary: {
        associations: asociatii.length,
        reminders: totalReminders,
        emailsSent: totalEmails,
        errors: errorCount,
      },
    })
  } catch (error) {
    console.error('Cron send-reminders error:', error)
    return NextResponse.json(
      { error: 'Failed to process reminders' },
      { status: 500 }
    )
  }
}
