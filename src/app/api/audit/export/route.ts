import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { checkRateLimit, getClientIdentifier, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit'

// GET — export audit log as PDF
export async function GET(request: Request) {
  try {
    // Rate limiting for export operations
    const clientId = getClientIdentifier(request)
    const rateLimitResult = checkRateLimit(`audit-export:${clientId}`, RATE_LIMIT_CONFIGS.api)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Prea multe cereri. Te rugăm să aștepți.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          }
        }
      )
    }

    const session = await getServerSession(authOptions)
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const asociatieId = searchParams.get('asociatieId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!asociatieId) {
      return NextResponse.json({ error: 'asociatieId obligatoriu' }, { status: 400 })
    }

    const where: any = { asociatieId }
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) where.createdAt.lte = new Date(to)
    }

    const logs = await db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: 1000,
    })

    const asociatie = await db.asociatie.findUnique({
      where: { id: asociatieId },
      select: { nume: true },
    })

    // Generate PDF
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.text(`Raport Audit — ${asociatie?.nume || 'Asociație'}`, 14, 15)

    doc.setFontSize(10)
    const dateRange = [
      from ? `De la: ${new Date(from).toLocaleDateString('ro-RO')}` : '',
      to ? `Până la: ${new Date(to).toLocaleDateString('ro-RO')}` : '',
    ].filter(Boolean).join(' | ')
    doc.text(dateRange || `Generat: ${new Date().toLocaleDateString('ro-RO')}`, 14, 22)

    const tableData = logs.map((log) => [
      new Date(log.createdAt).toLocaleString('ro-RO'),
      log.userName || log.userId || 'Sistem',
      log.actiune,
      log.entitate,
      log.notaExplicativa || '—',
    ])

    autoTable(doc, {
      head: [['Data/Ora', 'Utilizator', 'Acțiune', 'Entitate', 'Notă']],
      body: tableData,
      startY: 28,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 30 },
        4: { cellWidth: 50 },
      },
    })

    const pdfBuffer = doc.output('arraybuffer')

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="audit_${Date.now()}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Audit export error:', error)
    return NextResponse.json({ error: 'Eroare la generarea raportului' }, { status: 500 })
  }
}
