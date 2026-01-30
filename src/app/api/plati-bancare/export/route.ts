import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Helper: Generate CSV content
function generateCSV(plati: Array<{
  beneficiarNume: string
  beneficiarIban: string
  beneficiarBanca: string | null
  beneficiarCui: string | null
  suma: number
  descriere: string
  referinta: string | null
}>, contBancar: {
  iban: string
  banca: string
  nume: string
}): string {
  const header = [
    'Nr.',
    'IBAN Platitor',
    'Banca Platitor',
    'IBAN Beneficiar',
    'Nume Beneficiar',
    'CUI Beneficiar',
    'Banca Beneficiar',
    'Suma (RON)',
    'Descriere',
    'Referinta'
  ].join(',')

  const rows = plati.map((p, index) => [
    index + 1,
    contBancar.iban,
    `"${contBancar.banca}"`,
    p.beneficiarIban,
    `"${p.beneficiarNume.replace(/"/g, '""')}"`,
    p.beneficiarCui || '',
    `"${p.beneficiarBanca || ''}"`,
    p.suma.toFixed(2),
    `"${p.descriere.replace(/"/g, '""')}"`,
    p.referinta || ''
  ].join(','))

  return [header, ...rows].join('\n')
}

// Helper: Generate SEPA XML (pain.001.001.03)
function generateSEPAXML(plati: Array<{
  id: string
  beneficiarNume: string
  beneficiarIban: string
  beneficiarBanca: string | null
  suma: number
  descriere: string
  referinta: string | null
}>, contBancar: {
  iban: string
  banca: string
  codBic: string | null
}, asociatie: {
  nume: string
  cui: string | null
}): string {
  const now = new Date()
  const msgId = `MSG-${now.toISOString().replace(/[-:T]/g, '').slice(0, 14)}`
  const pmtInfId = `PMT-${now.toISOString().replace(/[-:T]/g, '').slice(0, 14)}`
  const ctrlSum = plati.reduce((sum, p) => sum + p.suma, 0).toFixed(2)

  const transactions = plati.map((p, index) => `
      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>${p.referinta || `TRX-${index + 1}`}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="RON">${p.suma.toFixed(2)}</InstdAmt>
        </Amt>
        <CdtrAgt>
          <FinInstnId>
            <Nm>${escapeXML(p.beneficiarBanca || 'UNKNOWN')}</Nm>
          </FinInstnId>
        </CdtrAgt>
        <Cdtr>
          <Nm>${escapeXML(p.beneficiarNume)}</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id>
            <IBAN>${p.beneficiarIban}</IBAN>
          </Id>
        </CdtrAcct>
        <RmtInf>
          <Ustrd>${escapeXML(p.descriere)}</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>`).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${now.toISOString()}</CreDtTm>
      <NbOfTxs>${plati.length}</NbOfTxs>
      <CtrlSum>${ctrlSum}</CtrlSum>
      <InitgPty>
        <Nm>${escapeXML(asociatie.nume)}</Nm>
        ${asociatie.cui ? `<Id><OrgId><Othr><Id>${asociatie.cui}</Id></Othr></OrgId></Id>` : ''}
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${pmtInfId}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${plati.length}</NbOfTxs>
      <CtrlSum>${ctrlSum}</CtrlSum>
      <ReqdExctnDt>${now.toISOString().slice(0, 10)}</ReqdExctnDt>
      <Dbtr>
        <Nm>${escapeXML(asociatie.nume)}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>${contBancar.iban}</IBAN>
        </Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>
          ${contBancar.codBic ? `<BIC>${contBancar.codBic}</BIC>` : `<Nm>${escapeXML(contBancar.banca)}</Nm>`}
        </FinInstnId>
      </DbtrAgt>${transactions}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// POST - export pending payments to file
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const body = await request.json()

    const { asociatieId, contBancarId, format, markAsExported } = body

    if (!asociatieId || !contBancarId || !format) {
      return NextResponse.json({ error: 'Date incomplete' }, { status: 400 })
    }

    if (!['csv', 'xml'].includes(format)) {
      return NextResponse.json({ error: 'Format invalid (csv sau xml)' }, { status: 400 })
    }

    // Verify user owns the association
    const asociatie = await db.asociatie.findFirst({
      where: { id: asociatieId, adminId: userId }
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    // Get bank account
    const contBancar = await db.contBancarAsociatie.findFirst({
      where: { id: contBancarId, asociatieId }
    })

    if (!contBancar) {
      return NextResponse.json({ error: 'Cont bancar negăsit' }, { status: 404 })
    }

    // Get pending payments for this bank account
    const plati = await db.plataBancaraPending.findMany({
      where: {
        asociatieId,
        contBancarId,
        status: 'PENDING'
      },
      orderBy: { createdAt: 'asc' }
    })

    if (plati.length === 0) {
      return NextResponse.json({ error: 'Nu există plăți în așteptare' }, { status: 400 })
    }

    // Generate file content
    let content: string
    let filename: string
    let contentType: string

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const bankName = contBancar.banca.replace(/\s+/g, '_')

    if (format === 'csv') {
      content = generateCSV(plati, contBancar)
      filename = `plati_${bankName}_${date}.csv`
      contentType = 'text/csv; charset=utf-8'
    } else {
      content = generateSEPAXML(plati, contBancar, asociatie)
      filename = `plati_${bankName}_${date}.xml`
      contentType = 'application/xml; charset=utf-8'
    }

    // Mark payments as exported if requested
    if (markAsExported) {
      await db.plataBancaraPending.updateMany({
        where: {
          id: { in: plati.map(p => p.id) }
        },
        data: {
          status: 'EXPORTED',
          exportedAt: new Date()
        }
      })
    }

    // Return as downloadable file
    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Filename': filename,
        'X-Payment-Count': plati.length.toString(),
        'X-Total-Amount': plati.reduce((sum, p) => sum + p.suma, 0).toFixed(2)
      }
    })
  } catch (error) {
    console.error('POST plati-bancare/export error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
