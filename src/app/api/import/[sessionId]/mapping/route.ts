import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

const mappingSchema = z.object({
  mapping: z.record(z.string(), z.string()), // { "Excel Column Name": "systemFieldKey" }
})

// POST — save column mapping (Step 2)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params
    const body = await request.json()
    const parsed = mappingSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Date invalide', details: parsed.error.flatten() }, { status: 400 })
    }

    const { mapping } = parsed.data

    // Validate required field 'numar' is mapped
    const mappedFields = Object.values(mapping)
    if (!mappedFields.includes('numar')) {
      return NextResponse.json(
        { error: 'Câmpul "Număr Unitate" trebuie mapat obligatoriu' },
        { status: 400 }
      )
    }

    const importSession = await db.importSession.findUnique({
      where: { id: sessionId },
    })

    if (!importSession || importSession.userId !== (session!.user as any).id) {
      return NextResponse.json({ error: 'Sesiune negăsită' }, { status: 404 })
    }

    await db.importSession.update({
      where: { id: sessionId },
      data: {
        colonneMapping: JSON.stringify(mapping),
        stepCurent: 2,
        status: 'MAPPING',
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Import mapping error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
