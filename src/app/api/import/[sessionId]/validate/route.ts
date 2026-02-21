import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { applyMapping, type SystemFieldKey } from '@/lib/import/excel-parser'
import {
  normalizeDecimal,
  validateCotaSum,
  validateImportRow,
  detectDuplicates,
  detectMultiPropertyOwners,
  type ImportRowError,
} from '@/lib/validations/import-validators'

// POST — run full validation (Step 3)
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
    const importSession = await db.importSession.findUnique({
      where: { id: sessionId },
    })

    if (!importSession || importSession.userId !== (session!.user as any).id) {
      return NextResponse.json({ error: 'Sesiune negăsită' }, { status: 404 })
    }

    if (!importSession.colonneMapping) {
      return NextResponse.json({ error: 'Maparea coloanelor nu a fost salvată' }, { status: 400 })
    }

    const mapping: Record<string, SystemFieldKey> = JSON.parse(importSession.colonneMapping)
    const allRows: any[][] = JSON.parse(importSession.parsedDataJson || '[]')
    const headers = Object.keys(mapping)

    // Apply mapping to all rows
    const mappedRows = allRows.map((row) => applyMapping(row, mapping, headers))

    // Normalize numeric values
    mappedRows.forEach((row) => {
      if (row.suprafata !== undefined && row.suprafata !== '') {
        row.suprafata = normalizeDecimal(row.suprafata)
      }
      if (row.cotaIndiviza !== undefined && row.cotaIndiviza !== '') {
        row.cotaIndiviza = normalizeDecimal(row.cotaIndiviza)
      }
      if (row.nrPersoane !== undefined && row.nrPersoane !== '') {
        row.nrPersoane = parseInt(String(row.nrPersoane), 10) || 1
      }
      if (row.etaj !== undefined && row.etaj !== '') {
        row.etaj = parseInt(String(row.etaj), 10)
      }
      if (row.nrCamere !== undefined && row.nrCamere !== '') {
        row.nrCamere = parseInt(String(row.nrCamere), 10)
      }
      // Trim string fields
      if (row.numar) row.numar = String(row.numar).trim()
      if (row.email) row.email = String(row.email).trim().toLowerCase()
      if (row.proprietarNume) row.proprietarNume = String(row.proprietarNume).trim()
      if (row.telefon) row.telefon = String(row.telefon).trim()
    })

    // Filter out completely empty rows
    const validMappedRows = mappedRows.filter((row) => row.numar && String(row.numar).trim() !== '')

    const errors: ImportRowError[] = []
    const warnings: ImportRowError[] = []

    // Per-row validation
    validMappedRows.forEach((row, idx) => {
      const rowErrors = validateImportRow(row, idx + 1)
      rowErrors.forEach((e) => {
        if (e.type === 'ERROR') errors.push(e)
        else warnings.push(e)
      })
    })

    // Global validations

    // 1. Cota indiviză sum check
    const cotaResult = validateCotaSum(validMappedRows)
    if (!cotaResult.valid && cotaResult.sum > 0) {
      warnings.push({
        type: 'WARNING',
        row: 0,
        field: 'cotaIndiviza',
        message: `Suma cotelor indiviză este ${cotaResult.sum}% (ar trebui ≈100%, diferență: ${cotaResult.diff}%)`,
      })
    }

    // 2. Duplicate numar
    const duplicates = detectDuplicates(validMappedRows, 'numar')
    duplicates.forEach((indices, numar) => {
      errors.push({
        type: 'ERROR',
        row: 0,
        field: 'numar',
        message: `Număr duplicat "${numar}" apare pe rândurile: ${indices.map((i) => i + 1).join(', ')}`,
        value: numar,
      })
    })

    // 3. Multi-property owner detection
    const multiOwners = detectMultiPropertyOwners(validMappedRows)
    multiOwners.forEach((units, email) => {
      warnings.push({
        type: 'WARNING',
        row: 0,
        field: 'email',
        message: `Proprietar cu mai multe unități detectat: ${email} → ${units.join(', ')}`,
        value: email,
      })
    })

    // 4. Check existing apartments in DB
    const existingApts = await db.apartament.findMany({
      where: { asociatieId: importSession.asociatieId },
      select: { numar: true },
    })
    const existingNums = new Set(existingApts.map((a) => a.numar))

    validMappedRows.forEach((row, idx) => {
      if (existingNums.has(String(row.numar))) {
        warnings.push({
          type: 'WARNING',
          row: idx + 1,
          field: 'numar',
          message: `Unitatea "${row.numar}" există deja în asociație (va fi ignorată)`,
          value: String(row.numar),
        })
      }
    })

    const hasBlockingErrors = errors.length > 0
    const status = hasBlockingErrors ? 'VALIDATING' : 'READY'

    await db.importSession.update({
      where: { id: sessionId },
      data: {
        errorsJson: JSON.stringify(errors),
        warningsJson: JSON.stringify(warnings),
        parsedDataJson: JSON.stringify(validMappedRows),
        stepCurent: 3,
        status,
      },
    })

    return NextResponse.json({
      errors,
      warnings,
      validRowsCount: validMappedRows.length,
      status,
    })
  } catch (error) {
    console.error('Import validate error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
