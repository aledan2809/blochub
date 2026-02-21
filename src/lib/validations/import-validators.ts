// Normalize decimal separator: 50,5 → 50.5
export function normalizeDecimal(value: string | number): number {
  if (typeof value === 'number') return value
  if (!value || typeof value !== 'string') return NaN
  return parseFloat(value.replace(',', '.'))
}

// Validate cotă indiviză sum ≈ 100%
export function validateCotaSum(
  rows: Array<{ cotaIndiviza?: number | null }>
): { valid: boolean; sum: number; diff: number } {
  const sum = rows.reduce((acc, r) => acc + (r.cotaIndiviza || 0), 0)
  const diff = Math.abs(sum - 100)
  return { valid: diff < 0.1, sum: Math.round(sum * 100) / 100, diff: Math.round(diff * 100) / 100 }
}

// Validate suprafață > 0
export function validateSuprafata(value: number | null | undefined): { valid: boolean; error?: string } {
  if (value === null || value === undefined) return { valid: true } // optional field
  if (value <= 0) return { valid: false, error: 'Suprafața trebuie să fie pozitivă' }
  if (value > 50000) return { valid: false, error: 'Suprafață nerealist de mare' }
  return { valid: true }
}

// Validate email format
export function validateEmail(email: string): boolean {
  if (!email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

// Validate phone with country prefix
export function validatePhone(phone: string): boolean {
  if (!phone) return false
  const cleaned = phone.replace(/[\s\-().]/g, '')
  // Must start with + and country code, total 8-16 digits
  return /^\+\d{8,16}$/.test(cleaned)
}

// Detect duplicate values in a field
export function detectDuplicates(
  rows: Array<Record<string, any>>,
  field: string
): Map<string, number[]> {
  const seen = new Map<string, number[]>()
  rows.forEach((row, idx) => {
    const val = String(row[field] ?? '').trim()
    if (!val) return
    const existing = seen.get(val) || []
    existing.push(idx)
    seen.set(val, existing)
  })
  // Return only duplicates
  return new Map([...seen].filter(([, indices]) => indices.length > 1))
}

// Detect multi-property owners (same email → multiple units)
export function detectMultiPropertyOwners(
  rows: Array<{ email?: string; numar?: string }>
): Map<string, string[]> {
  const emailToUnits = new Map<string, string[]>()
  rows.forEach((row) => {
    const email = row.email?.trim().toLowerCase()
    if (!email) return
    const units = emailToUnits.get(email) || []
    units.push(row.numar || '?')
    emailToUnits.set(email, units)
  })
  return new Map([...emailToUnits].filter(([, units]) => units.length > 1))
}

// Validate a single import row
export interface ImportRowError {
  type: 'ERROR' | 'WARNING'
  row: number
  field: string
  message: string
  value?: string
}

export function validateImportRow(
  row: Record<string, any>,
  rowIndex: number
): ImportRowError[] {
  const errors: ImportRowError[] = []

  // Required: numar
  if (!row.numar || String(row.numar).trim() === '') {
    errors.push({ type: 'ERROR', row: rowIndex, field: 'numar', message: 'Număr unitate lipsă' })
  }

  // Suprafata > 0
  if (row.suprafata !== undefined && row.suprafata !== null && row.suprafata !== '') {
    const sup = normalizeDecimal(row.suprafata)
    if (isNaN(sup) || sup <= 0) {
      errors.push({
        type: 'ERROR', row: rowIndex, field: 'suprafata',
        message: `Suprafață invalidă: ${row.suprafata}`, value: String(row.suprafata),
      })
    }
  }

  // Cota indiviza >= 0 and <= 100
  if (row.cotaIndiviza !== undefined && row.cotaIndiviza !== null && row.cotaIndiviza !== '') {
    const cota = normalizeDecimal(row.cotaIndiviza)
    if (isNaN(cota) || cota < 0 || cota > 100) {
      errors.push({
        type: 'ERROR', row: rowIndex, field: 'cotaIndiviza',
        message: `Cotă indiviză invalidă: ${row.cotaIndiviza}`, value: String(row.cotaIndiviza),
      })
    }
  }

  // Nr persoane defaults to 1, warn if missing
  if (!row.nrPersoane || row.nrPersoane === '' || row.nrPersoane === 0) {
    row.nrPersoane = 1
  }

  // Email format
  if (row.email && !validateEmail(row.email)) {
    errors.push({
      type: 'WARNING', row: rowIndex, field: 'email',
      message: `Format email invalid: ${row.email}`, value: row.email,
    })
  }

  // Phone format
  if (row.telefon && !validatePhone(row.telefon)) {
    errors.push({
      type: 'WARNING', row: rowIndex, field: 'telefon',
      message: `Format telefon invalid: ${row.telefon}`, value: row.telefon,
    })
  }

  return errors
}
