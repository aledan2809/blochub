import { NextResponse } from 'next/server'
import { generateStandardTemplate, generateBlocManagerTemplate } from '@/lib/import/template-generator'

// GET — download import template
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'standard'

    let buffer: Buffer
    let fileName: string

    if (format === 'blocmanager') {
      buffer = generateBlocManagerTemplate()
      fileName = 'template_blocmanager.xlsx'
    } else {
      buffer = generateStandardTemplate()
      fileName = 'template_blochub.xlsx'
    }

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('Template download error:', error)
    return NextResponse.json({ error: 'Eroare la generarea șablonului' }, { status: 500 })
  }
}
