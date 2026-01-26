import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const generateReportSchema = z.object({
  reportType: z.enum([
    'incasari-lunare',
    'cheltuieli-categorie',
    'sold-proprietari',
    'cashflow',
    'balanta',
    'restante-apartament',
    'istoric-plati',
    'consumuri',
    'rate-plata',
    'avg',
    'evidenta-plati',
    'situatie-restante',
    'raport-anual',
  ]),
  format: z.enum(['PDF', 'Excel', 'CSV', 'Word']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  filters: z.object({
    apartamentId: z.string().optional(),
    scaraId: z.string().optional(),
  }).optional(),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = generateReportSchema.parse(body)

    const userId = (session.user as { id: string }).id

    // Get user's association
    const asociatie = await db.asociatie.findFirst({
      where: { adminId: userId },
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație not found' }, { status: 404 })
    }

    // Generate report based on type
    const reportData = await generateReportData(data.reportType, asociatie.id, data)

    // Format report based on requested format
    const formattedReport = await formatReport(reportData, data.format)

    // Log report generation
    await db.agentLog.create({
      data: {
        agentType: 'RAPORT',
        input: JSON.stringify(data),
        output: `Report generated: ${data.reportType}`,
        success: true,
        durationMs: 0,
        userId,
        asociatieId: asociatie.id,
      },
    })

    return NextResponse.json({
      success: true,
      reportUrl: formattedReport.url,
      reportName: formattedReport.name,
      size: formattedReport.size,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error generating report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}

async function generateReportData(
  reportType: string,
  asociatieId: string,
  params: any
) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  switch (reportType) {
    case 'incasari-lunare':
      return await db.plata.groupBy({
        by: ['dataPlata'],
        where: {
          apartament: { asociatieId },
          status: 'CONFIRMED',
          dataPlata: {
            gte: params.startDate || startOfMonth,
            lte: params.endDate || endOfMonth,
          },
        },
        _sum: { suma: true },
        _count: true,
      })

    case 'cheltuieli-categorie':
      return await db.cheltuiala.groupBy({
        by: ['tip'],
        where: {
          asociatieId,
          dataFactura: {
            gte: params.startDate || startOfMonth,
            lte: params.endDate || endOfMonth,
          },
        },
        _sum: { suma: true },
        _count: true,
      })

    case 'sold-proprietari':
      const apartamente = await db.apartament.findMany({
        where: { asociatieId },
        include: {
          chitante: {
            where: { status: { in: ['GENERATA', 'TRIMISA', 'RESTANTA'] } },
            include: { plati: { where: { status: 'CONFIRMED' } } },
          },
          proprietari: {
            where: { esteActiv: true },
            include: { user: { select: { name: true, email: true } } },
          },
        },
      })

      return apartamente.map((apt) => {
        const totalDatorat = apt.chitante.reduce((sum, ch) => sum + ch.sumaTotal, 0)
        const totalPlatit = apt.chitante.reduce(
          (sum, ch) =>
            sum + ch.plati.reduce((pSum, p) => pSum + p.suma, 0),
          0
        )

        return {
          apartament: apt.numar,
          proprietari: apt.proprietari.map((p) => p.user.name).join(', '),
          datorat: totalDatorat,
          platit: totalPlatit,
          sold: totalDatorat - totalPlatit,
        }
      })

    case 'cashflow':
      // Complex cashflow calculation
      const [incasari, cheltuieli] = await Promise.all([
        db.plata.groupBy({
          by: ['dataPlata'],
          where: {
            apartament: { asociatieId },
            status: 'CONFIRMED',
            dataPlata: {
              gte: params.startDate || new Date(now.getFullYear(), 0, 1),
              lte: params.endDate || endOfMonth,
            },
          },
          _sum: { suma: true },
        }),
        db.cheltuiala.groupBy({
          by: ['dataFactura'],
          where: {
            asociatieId,
            dataFactura: {
              gte: params.startDate || new Date(now.getFullYear(), 0, 1),
              lte: params.endDate || endOfMonth,
            },
          },
          _sum: { suma: true },
        }),
      ])

      return { incasari, cheltuieli }

    case 'restante-apartament':
      return await db.apartament.findMany({
        where: {
          asociatieId,
          chitante: {
            some: {
              status: 'RESTANTA',
            },
          },
        },
        include: {
          chitante: {
            where: { status: 'RESTANTA' },
            include: {
              plati: { where: { status: 'CONFIRMED' } },
            },
          },
          proprietari: {
            where: { esteActiv: true },
            include: { user: { select: { name: true, email: true, phone: true } } },
          },
        },
      })

    default:
      throw new Error(`Report type ${reportType} not implemented`)
  }
}

async function formatReport(data: any, format: string) {
  // TODO: Implement actual formatting with libraries like:
  // - PDF: puppeteer or pdfkit
  // - Excel: exceljs
  // - CSV: csv-writer
  // - Word: docx

  // For now, return mock data
  return {
    url: `/reports/${Date.now()}.${format.toLowerCase()}`,
    name: `Raport_${Date.now()}.${format.toLowerCase()}`,
    size: '245 KB',
  }
}
