import * as XLSX from 'xlsx'

export interface ParsedSheet {
  name: string
  rowCount: number
}

export interface ParsedExcel {
  sheets: ParsedSheet[]
  selectedSheet: string
  headers: string[]
  allRows: any[][] // raw rows (arrays)
  totalRows: number
}

// Parse an Excel file buffer into structured data
export function parseExcelFile(buffer: ArrayBuffer, sheetName?: string): ParsedExcel {
  const workbook = XLSX.read(buffer, { type: 'array' })

  const sheets: ParsedSheet[] = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name]
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
    return { name, rowCount: range.e.r - range.s.r }
  })

  const selected = sheetName || workbook.SheetNames[0]
  const sheet = workbook.Sheets[selected]

  // Parse as array-of-arrays (header: 1 = raw arrays)
  const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
    defval: '',
  })

  // Find the header row — first row with 3+ non-empty cells
  let headerRowIdx = 0
  for (let i = 0; i < Math.min(rawData.length, 20); i++) {
    const nonEmpty = (rawData[i] || []).filter((c: any) => c !== '' && c !== null && c !== undefined)
    if (nonEmpty.length >= 3) {
      headerRowIdx = i
      break
    }
  }

  const headers = (rawData[headerRowIdx] || []).map((h: any) => String(h ?? '').trim())
  const dataRows = rawData.slice(headerRowIdx + 1).filter((row) => {
    // Skip rows where all cells are empty
    return row.some((c: any) => c !== '' && c !== null && c !== undefined)
  })

  return {
    sheets,
    selectedSheet: selected,
    headers,
    allRows: dataRows,
    totalRows: dataRows.length,
  }
}

// System fields available for mapping
export const SYSTEM_FIELDS = [
  { key: 'numar', label: 'Număr Unitate', required: true },
  { key: 'tipUnitate', label: 'Tip Unitate', required: false },
  { key: 'scara', label: 'Scară', required: false },
  { key: 'etaj', label: 'Etaj', required: false },
  { key: 'suprafata', label: 'Suprafață (mp)', required: false },
  { key: 'nrCamere', label: 'Nr. Camere', required: false },
  { key: 'nrPersoane', label: 'Nr. Persoane', required: false },
  { key: 'cotaIndiviza', label: 'Cotă Indiviză (%)', required: false },
  { key: 'nrCadastral', label: 'Nr. Cadastral', required: false },
  { key: 'proprietarNume', label: 'Proprietar (Nume)', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'telefon', label: 'Telefon', required: false },
  { key: 'serieContorApaRece', label: 'Serie Contor Apă Rece', required: false },
  { key: 'indexApaRece', label: 'Index Apă Rece', required: false },
  { key: 'serieContorApaCalda', label: 'Serie Contor Apă Caldă', required: false },
  { key: 'indexApaCalda', label: 'Index Apă Caldă', required: false },
] as const

export type SystemFieldKey = typeof SYSTEM_FIELDS[number]['key']

// Common column name patterns → system field mapping
const COLUMN_PATTERNS: Array<{ patterns: RegExp[]; field: SystemFieldKey }> = [
  {
    patterns: [/^nr\.?\s*ap/i, /^numar\s*(casa|unitate|apart)/i, /^numar$/i, /^ap\.?$/i, /^apart/i],
    field: 'numar',
  },
  {
    patterns: [/^tip\s*(unitate|apart)/i, /^tip$/i],
    field: 'tipUnitate',
  },
  {
    patterns: [/^scar[aă]$/i, /^sc\.?$/i],
    field: 'scara',
  },
  {
    patterns: [/^etaj/i, /^floor/i],
    field: 'etaj',
  },
  {
    patterns: [/^supr/i, /^suprafat[aă]/i, /^s\.?\s*util/i, /^mp$/i, /^teren.*mp/i],
    field: 'suprafata',
  },
  {
    patterns: [/^nr\.?\s*cam/i, /^camere/i],
    field: 'nrCamere',
  },
  {
    patterns: [/^nr\.?\s*pers/i, /^numar\s*pers/i, /^persoane/i],
    field: 'nrPersoane',
  },
  {
    patterns: [/^cot[aă]\s*(part|indivi)/i, /^%\s*cot[aă]/i, /^cota$/i, /^procent.*cot/i],
    field: 'cotaIndiviza',
  },
  {
    patterns: [/^nr\.?\s*cadastr/i, /^cadastr/i, /^carte\s*funciar/i, /^cf$/i],
    field: 'nrCadastral',
  },
  {
    patterns: [/^proprietar/i, /^numele/i, /^nume\s*(si|și)/i, /^nume$/i],
    field: 'proprietarNume',
  },
  {
    patterns: [/^e-?mail/i, /^mail$/i, /^adres[aă]\s*email/i],
    field: 'email',
  },
  {
    patterns: [/^tel/i, /^phone/i, /^mobil/i, /^nr\.?\s*tel/i],
    field: 'telefon',
  },
]

// Auto-detect column mapping based on header names
export function autoDetectMapping(headers: string[]): Record<string, SystemFieldKey> {
  const mapping: Record<string, SystemFieldKey> = {}

  headers.forEach((header) => {
    if (!header) return
    const normalized = header.trim()

    for (const { patterns, field } of COLUMN_PATTERNS) {
      if (patterns.some((p) => p.test(normalized))) {
        // Don't overwrite if already mapped
        if (!Object.values(mapping).includes(field)) {
          mapping[normalized] = field
        }
        break
      }
    }
  })

  return mapping
}

// Apply mapping to transform a raw row into a structured object
export function applyMapping(
  row: any[],
  mapping: Record<string, SystemFieldKey>,
  headers: string[]
): Record<SystemFieldKey, any> {
  const result: Record<string, any> = {}

  Object.entries(mapping).forEach(([headerName, fieldKey]) => {
    const colIdx = headers.indexOf(headerName)
    if (colIdx === -1) return
    const rawValue = row[colIdx]
    result[fieldKey] = rawValue !== undefined && rawValue !== null ? rawValue : ''
  })

  return result as Record<SystemFieldKey, any>
}
