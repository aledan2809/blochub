import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Type definitions
interface Plata {
  id: string
  beneficiarNume: string
  beneficiarIban: string
  beneficiarBanca: string | null
  beneficiarCui: string | null
  suma: number
  descriere: string
  referinta: string | null
}

interface ContBancar {
  iban: string
  banca: string
  nume: string
  codBic: string | null
}

interface Asociatie {
  nume: string
  cui: string | null
}

// Format date as DD.MM.YYYY (Romanian format)
function formatDateRO(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}.${month}.${year}`
}

// Remove diacritics for bank compatibility
function removeDiacritics(str: string): string {
  return str
    .replace(/[ăâ]/g, 'a')
    .replace(/[ĂÂ]/g, 'A')
    .replace(/[îï]/g, 'i')
    .replace(/[ÎÏ]/g, 'I')
    .replace(/[șş]/g, 's')
    .replace(/[ȘŞ]/g, 'S')
    .replace(/[țţ]/g, 't')
    .replace(/[ȚŢ]/g, 'T')
}

// ============================================
// BANCA TRANSILVANIA (BT) FORMAT
// ============================================
function generateBT(plati: Plata[], contBancar: ContBancar): string {
  // BT uses semicolon separator, Windows-1250 encoding
  const header = [
    'Cont platitor',
    'Nume beneficiar',
    'Cont beneficiar',
    'Banca beneficiar',
    'Suma',
    'Moneda',
    'Detalii plata',
    'CUI beneficiar',
    'Data platii'
  ].join(';')

  const today = formatDateRO(new Date())
  const rows = plati.map(p => [
    contBancar.iban,
    removeDiacritics(p.beneficiarNume),
    p.beneficiarIban,
    removeDiacritics(p.beneficiarBanca || ''),
    p.suma.toFixed(2),
    'RON',
    removeDiacritics(p.descriere),
    p.beneficiarCui || '',
    today
  ].join(';'))

  return [header, ...rows].join('\r\n')
}

// ============================================
// BCR FORMAT
// ============================================
function generateBCR(plati: Plata[], contBancar: ContBancar): string {
  // BCR uses semicolon separator
  const header = [
    'IBAN Platitor',
    'IBAN Beneficiar',
    'Nume Beneficiar',
    'CIF/CNP Beneficiar',
    'Suma',
    'Moneda',
    'Referinta',
    'Detalii'
  ].join(';')

  const rows = plati.map(p => [
    contBancar.iban,
    p.beneficiarIban,
    `"${removeDiacritics(p.beneficiarNume)}"`,
    p.beneficiarCui || '',
    p.suma.toFixed(2),
    'RON',
    p.referinta || '',
    `"${removeDiacritics(p.descriere)}"`
  ].join(';'))

  return [header, ...rows].join('\r\n')
}

// ============================================
// ING FORMAT
// ============================================
function generateING(plati: Plata[], contBancar: ContBancar): string {
  // ING accepts standard CSV with specific columns
  const header = [
    'Debit account',
    'Beneficiary name',
    'Beneficiary account',
    'Amount',
    'Currency',
    'Payment details',
    'Beneficiary address'
  ].join(',')

  const rows = plati.map(p => [
    contBancar.iban,
    `"${removeDiacritics(p.beneficiarNume)}"`,
    p.beneficiarIban,
    p.suma.toFixed(2),
    'RON',
    `"${removeDiacritics(p.descriere)}"`,
    '""'
  ].join(','))

  return [header, ...rows].join('\r\n')
}

// ============================================
// RAIFFEISEN FORMAT
// ============================================
function generateRaiffeisen(plati: Plata[], contBancar: ContBancar): string {
  // Raiffeisen MultiCash-like format
  const header = [
    'Cont ordonator',
    'Nume beneficiar',
    'Cont beneficiar',
    'Cod BIC beneficiar',
    'Suma',
    'Valuta',
    'Detalii plata 1',
    'Detalii plata 2',
    'Cod fiscal beneficiar',
    'Urgent'
  ].join(';')

  const rows = plati.map(p => {
    const descriere = removeDiacritics(p.descriere)
    const detalii1 = descriere.substring(0, 35)
    const detalii2 = descriere.substring(35, 70)
    return [
      contBancar.iban,
      removeDiacritics(p.beneficiarNume),
      p.beneficiarIban,
      '',
      p.suma.toFixed(2),
      'RON',
      detalii1,
      detalii2,
      p.beneficiarCui || '',
      'N'
    ].join(';')
  })

  return [header, ...rows].join('\r\n')
}

// ============================================
// BRD FORMAT
// ============================================
function generateBRD(plati: Plata[], contBancar: ContBancar): string {
  // BRD uses semicolon separator
  const header = [
    'Cont debitor',
    'Cont creditor',
    'Nume creditor',
    'Adresa creditor',
    'CUI creditor',
    'Suma',
    'Moneda',
    'Explicatie plata',
    'Referinta'
  ].join(';')

  const rows = plati.map(p => [
    contBancar.iban,
    p.beneficiarIban,
    `"${removeDiacritics(p.beneficiarNume)}"`,
    '""',
    p.beneficiarCui || '',
    p.suma.toFixed(2),
    'RON',
    `"${removeDiacritics(p.descriere)}"`,
    p.referinta || ''
  ].join(';'))

  return [header, ...rows].join('\r\n')
}

// ============================================
// CEC BANK FORMAT
// ============================================
function generateCEC(plati: Plata[], contBancar: ContBancar): string {
  // CEC Bank format
  const header = [
    'IBAN Platitor',
    'IBAN Beneficiar',
    'Denumire Beneficiar',
    'CUI Beneficiar',
    'Suma',
    'Descriere',
    'Data executare'
  ].join(';')

  const today = formatDateRO(new Date())
  const rows = plati.map(p => [
    contBancar.iban,
    p.beneficiarIban,
    `"${removeDiacritics(p.beneficiarNume)}"`,
    p.beneficiarCui || '',
    p.suma.toFixed(2),
    `"${removeDiacritics(p.descriere)}"`,
    today
  ].join(';'))

  return [header, ...rows].join('\r\n')
}

// ============================================
// UNICREDIT FORMAT
// ============================================
function generateUniCredit(plati: Plata[], contBancar: ContBancar): string {
  const header = [
    'Account',
    'Beneficiary Account',
    'Beneficiary Name',
    'Amount',
    'Currency',
    'Details',
    'Beneficiary Tax ID'
  ].join(';')

  const rows = plati.map(p => [
    contBancar.iban,
    p.beneficiarIban,
    `"${removeDiacritics(p.beneficiarNume)}"`,
    p.suma.toFixed(2),
    'RON',
    `"${removeDiacritics(p.descriere)}"`,
    p.beneficiarCui || ''
  ].join(';'))

  return [header, ...rows].join('\r\n')
}

// ============================================
// ALPHA BANK FORMAT
// ============================================
function generateAlphaBank(plati: Plata[], contBancar: ContBancar): string {
  const header = [
    'Cont sursa',
    'IBAN Destinatar',
    'Nume Destinatar',
    'Suma',
    'Valuta',
    'Descriere',
    'CIF Destinatar'
  ].join(';')

  const rows = plati.map(p => [
    contBancar.iban,
    p.beneficiarIban,
    `"${removeDiacritics(p.beneficiarNume)}"`,
    p.suma.toFixed(2),
    'RON',
    `"${removeDiacritics(p.descriere)}"`,
    p.beneficiarCui || ''
  ].join(';'))

  return [header, ...rows].join('\r\n')
}

// ============================================
// GENERIC CSV FORMAT
// ============================================
function generateCSV(plati: Plata[], contBancar: ContBancar): string {
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

// ============================================
// SEPA XML (pain.001.001.03)
// ============================================
function generateSEPAXML(plati: Plata[], contBancar: ContBancar, asociatie: Asociatie): string {
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

    const validFormats = ['csv', 'xml', 'bt', 'bcr', 'ing', 'raiffeisen', 'brd', 'cec', 'unicredit', 'alpha']
    if (!validFormats.includes(format)) {
      return NextResponse.json({ error: 'Format invalid' }, { status: 400 })
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

    // Generate file content based on format
    let content: string
    let filename: string
    let contentType: string

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const bankName = contBancar.banca.replace(/\s+/g, '_')

    // Bank-specific format labels for filename
    const formatLabels: Record<string, string> = {
      csv: 'generic',
      xml: 'SEPA',
      bt: 'BT',
      bcr: 'BCR',
      ing: 'ING',
      raiffeisen: 'Raiffeisen',
      brd: 'BRD',
      cec: 'CEC',
      unicredit: 'UniCredit',
      alpha: 'AlphaBank'
    }

    switch (format) {
      case 'bt':
        content = generateBT(plati, contBancar)
        filename = `plati_${formatLabels[format]}_${date}.csv`
        contentType = 'text/csv; charset=windows-1250'
        break
      case 'bcr':
        content = generateBCR(plati, contBancar)
        filename = `plati_${formatLabels[format]}_${date}.csv`
        contentType = 'text/csv; charset=utf-8'
        break
      case 'ing':
        content = generateING(plati, contBancar)
        filename = `plati_${formatLabels[format]}_${date}.csv`
        contentType = 'text/csv; charset=utf-8'
        break
      case 'raiffeisen':
        content = generateRaiffeisen(plati, contBancar)
        filename = `plati_${formatLabels[format]}_${date}.csv`
        contentType = 'text/csv; charset=utf-8'
        break
      case 'brd':
        content = generateBRD(plati, contBancar)
        filename = `plati_${formatLabels[format]}_${date}.csv`
        contentType = 'text/csv; charset=utf-8'
        break
      case 'cec':
        content = generateCEC(plati, contBancar)
        filename = `plati_${formatLabels[format]}_${date}.csv`
        contentType = 'text/csv; charset=utf-8'
        break
      case 'unicredit':
        content = generateUniCredit(plati, contBancar)
        filename = `plati_${formatLabels[format]}_${date}.csv`
        contentType = 'text/csv; charset=utf-8'
        break
      case 'alpha':
        content = generateAlphaBank(plati, contBancar)
        filename = `plati_${formatLabels[format]}_${date}.csv`
        contentType = 'text/csv; charset=utf-8'
        break
      case 'xml':
        content = generateSEPAXML(plati, contBancar, asociatie)
        filename = `plati_${formatLabels[format]}_${date}.xml`
        contentType = 'application/xml; charset=utf-8'
        break
      default: // csv
        content = generateCSV(plati, contBancar)
        filename = `plati_${bankName}_${date}.csv`
        contentType = 'text/csv; charset=utf-8'
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
