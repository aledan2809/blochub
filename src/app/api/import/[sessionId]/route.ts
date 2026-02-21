import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

// GET import session details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params
    const importSession = await db.importSession.findUnique({
      where: { id: sessionId },
    })

    if (!importSession || importSession.userId !== (session!.user as any).id) {
      return NextResponse.json({ error: 'Sesiune negăsită' }, { status: 404 })
    }

    return NextResponse.json({ session: importSession })
  } catch (error) {
    console.error('Import session GET error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// DELETE — cancel/cleanup import session
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params
    const importSession = await db.importSession.findUnique({
      where: { id: sessionId },
    })

    if (!importSession || importSession.userId !== (session!.user as any).id) {
      return NextResponse.json({ error: 'Sesiune negăsită' }, { status: 404 })
    }

    await db.importSession.delete({ where: { id: sessionId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Import session DELETE error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
