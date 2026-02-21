const OCR_BASE_URL = process.env.OCR_SERVICE_URL || 'http://localhost:8000'

interface OCRResult {
  texts: string[]
  confidences: number[]
  engine: string
}

interface ParsedPDF {
  headers: string[]
  rows: string[][]
  totalRows: number
  ocrConfidence: number
  rawText: string
}

// Send a PDF to the OCR module and get extracted text
export async function parsePDFViaOCR(
  fileBuffer: Buffer,
  fileName: string
): Promise<{ texts: string[]; confidence: number }> {
  // Step 1: Create session
  const sessionRes = await fetch(`${OCR_BASE_URL}/api/session/create`, { method: 'POST' })
  if (!sessionRes.ok) throw new Error('OCR: Nu s-a putut crea sesiunea')
  const { session_id } = await sessionRes.json()

  try {
    // Step 2: Upload file
    const formData = new FormData()
    const blob = new Blob([new Uint8Array(fileBuffer)], { type: 'application/pdf' })
    formData.append('files', blob, fileName)

    const uploadRes = await fetch(
      `${OCR_BASE_URL}/api/upload?session_id=${session_id}`,
      { method: 'POST', body: formData }
    )
    if (!uploadRes.ok) throw new Error('OCR: Eroare la upload fișier')

    // Step 3: Process
    const processRes = await fetch(`${OCR_BASE_URL}/api/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id,
        use_tesseract: true,
        use_easyocr: true,
        anonymize: false,
      }),
    })
    if (!processRes.ok) throw new Error('OCR: Eroare la procesare')

    // Step 4: Get results
    const resultsRes = await fetch(`${OCR_BASE_URL}/api/results/${session_id}`)
    if (!resultsRes.ok) throw new Error('OCR: Eroare la preluare rezultate')
    const data = await resultsRes.json()

    // Pick best result by confidence
    const results = data.results || {}
    let bestTexts: string[] = []
    let bestConfidence = 0

    for (const key of Object.keys(results)) {
      const result: OCRResult = results[key]
      const avgConf =
        result.confidences.length > 0
          ? result.confidences.reduce((a, b) => a + b, 0) / result.confidences.length
          : 0
      if (avgConf > bestConfidence) {
        bestConfidence = avgConf
        bestTexts = result.texts
      }
    }

    return { texts: bestTexts, confidence: bestConfidence }
  } finally {
    // Step 5: Cleanup
    await fetch(`${OCR_BASE_URL}/api/session/${session_id}`, { method: 'DELETE' }).catch(() => {})
  }
}

// Extract table structure from OCR text
export function extractTableFromOCRText(rawText: string): ParsedPDF {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean)

  // Heuristic: detect rows that look like table data
  // Look for lines with multiple whitespace-separated columns or tab-separated
  const tableRows: string[][] = []
  let headers: string[] = []

  for (const line of lines) {
    // Split by 2+ spaces or tabs
    const cells = line.split(/\s{2,}|\t/).map((c) => c.trim()).filter(Boolean)

    if (cells.length >= 3) {
      if (headers.length === 0) {
        // First row with 3+ cells is likely the header
        headers = cells
      } else {
        tableRows.push(cells)
      }
    }
  }

  return {
    headers,
    rows: tableRows,
    totalRows: tableRows.length,
    ocrConfidence: 0,
    rawText,
  }
}
