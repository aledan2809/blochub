import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

// GET — paginated audit log
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const asociatieId = searchParams.get('asociatieId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const actiune = searchParams.get('actiune')
    const entitate = searchParams.get('entitate')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

    if (!asociatieId) {
      return NextResponse.json({ error: 'asociatieId obligatoriu' }, { status: 400 })
    }

    const where: any = { asociatieId }
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) where.createdAt.lte = new Date(to)
    }
    if (actiune) where.actiune = actiune
    if (entitate) where.entitate = entitate

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.auditLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Audit log error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
