import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const today = new Date()

    const result = await db.chitanta.updateMany({
      where: {
        status: {
          in: ['GENERATA', 'TRIMISA', 'PARTIAL_PLATITA'],
        },
        dataScadenta: {
          lt: today,
        },
      },
      data: {
        status: 'RESTANTA',
      },
    })

    return NextResponse.json({
      success: true,
      message: `Marked ${result.count} chitante as RESTANTA`,
    })
  } catch (error) {
    console.error('Cron mark-restante error:', error)
    return NextResponse.json(
      { error: 'Failed to mark restante' },
      { status: 500 }
    )
  }
}
