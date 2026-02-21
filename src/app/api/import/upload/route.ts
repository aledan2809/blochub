import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { parseExcelFile, autoDetectMapping } from '@/lib/import/excel-parser'
import { parsePDFViaOCR, extractTableFromOCRText } from '@/lib/import/pdf-parser'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const asociatieId = formData.get('asociatieId') as string | null

    if (!file || !asociatieId) {
      return NextResponse.json({ error: 'Lipsește fișierul sau asociatieId' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Fișierul depășește 10MB' }, { status: 400 })
    }

    // Verify user has access to this association
    const asociatie = await db.asociatie.findFirst({
      where: { id: asociatieId, adminId: (session!.user as any).id },
    })
    if (!asociatie) {
      return NextResponse.json({ error: 'Nu aveți acces la această asociație' }, { status: 403 })
    }

    const fileName = file.name
    const isExcel = /\.(xlsx?|xls)$/i.test(fileName)
    const isPDF = /\.pdf$/i.test(fileName)

    if (!isExcel && !isPDF) {
      return NextResponse.json(
        { error: 'Format nesuportat. Acceptăm: .xlsx, .xls, .pdf' },
        { status: 400 }
      )
    }

    const buffer = await file.arrayBuffer()
    let sheets: Array<{ name: string; rowCount: number }> = []
    let headers: string[] = []
    let previewRows: any[][] = []
    let totalRows = 0
    let allRowsJson: string = '[]'
    let autoMapping: Record<string, string> = {}
    let ocrConfidence: number | undefined

    if (isExcel) {
      const parsed = parseExcelFile(buffer)
      sheets = parsed.sheets
      headers = parsed.headers
      previewRows = parsed.allRows.slice(0, 20)
      totalRows = parsed.totalRows
      allRowsJson = JSON.stringify(parsed.allRows)
      autoMapping = autoDetectMapping(parsed.headers)
    } else {
      // PDF — call OCR module
      const ocrResult = await parsePDFViaOCR(
        Buffer.from(buffer),
        fileName
      )
      ocrConfidence = ocrResult.confidence

      const parsed = extractTableFromOCRText(ocrResult.texts.join('\n'))
      sheets = [{ name: 'PDF', rowCount: parsed.totalRows }]
      headers = parsed.headers
      previewRows = parsed.rows.slice(0, 20)
      totalRows = parsed.totalRows
      allRowsJson = JSON.stringify(parsed.rows)
      autoMapping = autoDetectMapping(parsed.headers)
    }

    // Create import session
    const importSession = await db.importSession.create({
      data: {
        asociatieId,
        userId: (session!.user as any).id,
        tipFisier: isExcel ? 'EXCEL' : 'PDF',
        numeFisier: fileName,
        status: 'PENDING',
        stepCurent: 1,
        selectedSheet: sheets[0]?.name || null,
        parsedDataJson: allRowsJson,
      },
    })

    return NextResponse.json({
      sessionId: importSession.id,
      preview: {
        sheets,
        selectedSheet: sheets[0]?.name,
        headers,
        previewRows,
        totalRows,
        autoMapping,
        ocrConfidence,
      },
    })
  } catch (error) {
    console.error('Import upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Eroare la procesarea fișierului' },
      { status: 500 }
    )
  }
}
