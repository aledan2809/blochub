import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { parseExcelFile, autoDetectMapping } from '@/lib/import/excel-parser'

// POST — switch to a different sheet in multi-sheet Excel
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
    const { sheetName } = await request.json()

    if (!sheetName) {
      return NextResponse.json({ error: 'sheetName obligatoriu' }, { status: 400 })
    }

    const importSession = await db.importSession.findUnique({
      where: { id: sessionId },
    })

    if (!importSession || importSession.userId !== (session!.user as any).id) {
      return NextResponse.json({ error: 'Sesiune negăsită' }, { status: 404 })
    }

    if (importSession.tipFisier !== 'EXCEL') {
      return NextResponse.json({ error: 'Doar fișierele Excel suportă multiple foi' }, { status: 400 })
    }

    // We need to re-parse the file. Since we don't store the raw file,
    // we stored parsedDataJson for the initially selected sheet.
    // For sheet switching, the client needs to re-upload or we need file storage.
    // For now, return error asking for re-upload with specific sheet.
    return NextResponse.json(
      { error: 'Pentru a schimba foaia, reîncărcați fișierul.' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Import sheet switch error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
