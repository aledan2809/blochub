/**
 * Invoice Generation & Sending for BlocHub Subscriptions
 *
 * Generates PDF invoices for subscription payments and sends them via email.
 */

import { db } from './db'
import { sendEmail } from './email'
import { getCompanyBillingDetails } from './revolut'

// ============================================
// TYPES
// ============================================

export interface InvoiceData {
  numar: string
  dataEmitere: Date
  dataScadenta: Date
  dataPlatii?: Date | null

  // Seller (BlocHub)
  vanzator: {
    nume: string
    cui: string
    adresa: string
    email: string
    contBancar: string
    banca: string
  }

  // Buyer (Organization)
  cumparator: {
    nume: string
    cui?: string
    adresa?: string
    email?: string
  }

  // Items
  items: Array<{
    descriere: string
    cantitate: number
    pretUnitar: number
    valoare: number
  }>

  // Totals
  subtotal: number
  tva: number
  total: number
}

export interface SendInvoiceEmailOptions {
  to: string
  organizationName: string
  invoiceNumber: string
  amount: number
  pdfBuffer: Buffer
}

// ============================================
// PDF GENERATION
// ============================================

/**
 * Generate PDF invoice for a subscription payment
 *
 * Note: In production, use a proper PDF library like pdfkit, jspdf, or puppeteer
 * This is a simplified implementation that generates HTML which can be
 * converted to PDF using a service or headless browser.
 */
export async function generateInvoicePDF(facturaId: string): Promise<Buffer | null> {
  try {
    const factura = await db.facturaAbonament.findUnique({
      where: { id: facturaId },
      include: {
        abonament: {
          include: {
            organizatie: true,
            plan: true,
          },
        },
      },
    })

    if (!factura) {
      console.error('Invoice not found:', facturaId)
      return null
    }

    // Get company billing details from platform settings
    const company = await getCompanyBillingDetails()
    const settings = await db.platformSettings.findUnique({
      where: { id: 'default' },
    })

    const invoiceData: InvoiceData = {
      numar: factura.numar,
      dataEmitere: factura.dataEmitere,
      dataScadenta: factura.dataScadenta,
      dataPlatii: factura.dataPlatii,

      vanzator: {
        nume: company?.name || 'BlocHub SRL',
        cui: company?.cui || 'Neconfigurat',
        adresa: [company?.address, company?.city, company?.county, company?.country]
          .filter(Boolean)
          .join(', ') || 'Neconfigurat',
        email: company?.email || settings?.supportEmail || 'facturare@blochub.ro',
        contBancar: company?.iban || 'Neconfigurat',
        banca: company?.bank || 'Neconfigurat',
      },

      cumparator: {
        nume: factura.abonament.organizatie.nume,
        cui: factura.abonament.organizatie.cui || undefined,
        adresa: factura.abonament.organizatie.adresa || undefined,
        email:
          factura.abonament.organizatie.emailFacturare ||
          factura.abonament.organizatie.email ||
          undefined,
      },

      items: [
        {
          descriere: `Abonament ${factura.abonament.plan.nume} - ${factura.perioada} (${factura.nrApartamente} apartamente)`,
          cantitate: factura.nrApartamente,
          pretUnitar: factura.pretUnitar,
          valoare: factura.subtotal,
        },
      ],

      subtotal: factura.subtotal,
      tva: factura.tva,
      total: factura.total,
    }

    // Generate HTML invoice
    const html = generateInvoiceHTML(invoiceData)

    // In production, convert HTML to PDF using:
    // - puppeteer (headless Chrome)
    // - pdfkit
    // - html-pdf
    // - external service like PDF.co, DocRaptor, etc.

    // For now, return HTML as buffer (you'd replace this with actual PDF generation)
    const buffer = Buffer.from(html, 'utf-8')

    console.log('Invoice PDF generated for:', facturaId)
    return buffer
  } catch (error) {
    console.error('Error generating invoice PDF:', error)
    return null
  }
}

/**
 * Generate HTML invoice template
 */
function generateInvoiceHTML(data: InvoiceData): string {
  const formatDate = (date: Date) =>
    date.toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

  const formatAmount = (amount: number) =>
    amount.toLocaleString('ro-RO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factură ${data.numar}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #333;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 20px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
    }
    .invoice-title {
      text-align: right;
    }
    .invoice-title h1 {
      font-size: 28px;
      color: #111;
      margin-bottom: 8px;
    }
    .invoice-number {
      font-size: 14px;
      color: #666;
    }
    .parties {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    .party {
      width: 45%;
    }
    .party h3 {
      font-size: 11px;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 8px;
      letter-spacing: 0.5px;
    }
    .party-name {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .party-details {
      color: #555;
      font-size: 12px;
    }
    .dates {
      display: flex;
      gap: 40px;
      margin-bottom: 30px;
      padding: 15px;
      background: #f8fafc;
      border-radius: 8px;
    }
    .date-item {
      display: flex;
      flex-direction: column;
    }
    .date-label {
      font-size: 10px;
      text-transform: uppercase;
      color: #666;
    }
    .date-value {
      font-weight: bold;
      color: #111;
    }
    .paid-badge {
      background: #dcfce7;
      color: #16a34a;
      padding: 4px 12px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 11px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th {
      background: #f1f5f9;
      text-align: left;
      padding: 12px;
      font-size: 11px;
      text-transform: uppercase;
      color: #64748b;
      border-bottom: 2px solid #e2e8f0;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .text-right { text-align: right; }
    .totals {
      margin-left: auto;
      width: 300px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .total-row.final {
      font-size: 18px;
      font-weight: bold;
      color: #2563eb;
      border-bottom: none;
      padding-top: 12px;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #666;
      font-size: 11px;
    }
    .bank-info {
      margin-top: 30px;
      padding: 15px;
      background: #f8fafc;
      border-radius: 8px;
    }
    .bank-info h4 {
      font-size: 12px;
      margin-bottom: 8px;
      color: #333;
    }
    .bank-info p {
      color: #555;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      🏢 ${data.vanzator.nume}
    </div>
    <div class="invoice-title">
      <h1>FACTURĂ</h1>
      <p class="invoice-number">${data.numar}</p>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>Furnizor</h3>
      <p class="party-name">${data.vanzator.nume}</p>
      <div class="party-details">
        <p>CUI: ${data.vanzator.cui}</p>
        <p>${data.vanzator.adresa}</p>
        <p>${data.vanzator.email}</p>
      </div>
    </div>
    <div class="party">
      <h3>Cumpărător</h3>
      <p class="party-name">${data.cumparator.nume}</p>
      <div class="party-details">
        ${data.cumparator.cui ? `<p>CUI: ${data.cumparator.cui}</p>` : ''}
        ${data.cumparator.adresa ? `<p>${data.cumparator.adresa}</p>` : ''}
        ${data.cumparator.email ? `<p>${data.cumparator.email}</p>` : ''}
      </div>
    </div>
  </div>

  <div class="dates">
    <div class="date-item">
      <span class="date-label">Data emiterii</span>
      <span class="date-value">${formatDate(data.dataEmitere)}</span>
    </div>
    <div class="date-item">
      <span class="date-label">Data scadenței</span>
      <span class="date-value">${formatDate(data.dataScadenta)}</span>
    </div>
    ${
      data.dataPlatii
        ? `
    <div class="date-item">
      <span class="date-label">Data plății</span>
      <span class="date-value">${formatDate(data.dataPlatii)}</span>
    </div>
    <div class="date-item">
      <span class="paid-badge">✓ PLĂTITĂ</span>
    </div>
    `
        : ''
    }
  </div>

  <table>
    <thead>
      <tr>
        <th>Descriere</th>
        <th class="text-right">Cantitate</th>
        <th class="text-right">Preț unitar</th>
        <th class="text-right">Valoare</th>
      </tr>
    </thead>
    <tbody>
      ${data.items
        .map(
          (item) => `
        <tr>
          <td>${item.descriere}</td>
          <td class="text-right">${item.cantitate}</td>
          <td class="text-right">${formatAmount(item.pretUnitar)} lei</td>
          <td class="text-right">${formatAmount(item.valoare)} lei</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row">
      <span>Subtotal:</span>
      <span>${formatAmount(data.subtotal)} lei</span>
    </div>
    <div class="total-row">
      <span>TVA (19%):</span>
      <span>${formatAmount(data.tva)} lei</span>
    </div>
    <div class="total-row final">
      <span>TOTAL:</span>
      <span>${formatAmount(data.total)} lei</span>
    </div>
  </div>

  <div class="bank-info">
    <h4>Date bancare pentru plată:</h4>
    <p><strong>IBAN:</strong> ${data.vanzator.contBancar}</p>
    <p><strong>Banca:</strong> ${data.vanzator.banca}</p>
    <p><strong>Beneficiar:</strong> ${data.vanzator.nume}</p>
  </div>

  <div class="footer">
    <p>Factură generată automat de ${data.vanzator.nume}</p>
    <p>© ${new Date().getFullYear()} ${data.vanzator.nume} - Toate drepturile rezervate</p>
  </div>
</body>
</html>
`
}

// ============================================
// EMAIL SENDING
// ============================================

/**
 * Send invoice via email
 */
export async function sendInvoiceEmail(options: SendInvoiceEmailOptions): Promise<boolean> {
  const { to, organizationName, invoiceNumber, amount, pdfBuffer } = options

  const formatAmount = (amt: number) =>
    amt.toLocaleString('ro-RO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #374151; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #16a34a, #059669); color: white; padding: 24px; border-radius: 12px 12px 0 0; }
    .content { background: #f9fafb; padding: 24px; border-radius: 0 0 12px 12px; }
    .success-icon { font-size: 48px; margin-bottom: 12px; }
    .amount { font-size: 28px; font-weight: bold; color: #16a34a; }
    .invoice-box { background: white; padding: 16px; border-radius: 8px; border-left: 4px solid #16a34a; margin: 16px 0; }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="success-icon">✓</div>
      <h1 style="margin: 0; font-size: 24px;">Plată confirmată</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">Factura ${invoiceNumber}</p>
    </div>
    <div class="content">
      <p>Bună,</p>

      <p>Vă confirmăm că plata pentru abonamentul BlocHub a fost procesată cu succes.</p>

      <div class="invoice-box">
        <p><strong>Organizație:</strong> ${organizationName}</p>
        <p><strong>Factură:</strong> ${invoiceNumber}</p>
        <p><strong>Sumă achitată:</strong> <span class="amount">${formatAmount(amount)} lei</span></p>
      </div>

      <p>Factura este atașată la acest email în format PDF.</p>

      <p style="margin-top: 24px;">
        Vă mulțumim că folosiți BlocHub pentru administrarea asociației!
      </p>
    </div>
    <div class="footer">
      <p>Acest email a fost trimis automat de BlocHub.</p>
      <p>© ${new Date().getFullYear()} BlocHub - Administrare inteligentă</p>
    </div>
  </div>
</body>
</html>
`

  try {
    const result = await sendEmail({
      to,
      subject: `[BlocHub] Factură ${invoiceNumber} - Plată confirmată`,
      html,
      // Note: For attachments, you'll need to modify sendEmail to support them
      // or use a different email sending method for invoices
    })

    if (result.success) {
      console.log('Invoice email sent to:', to)
      return true
    } else {
      console.error('Failed to send invoice email:', result.error)
      return false
    }
  } catch (error) {
    console.error('Error sending invoice email:', error)
    return false
  }
}

// ============================================
// INVOICE GENERATION TRIGGER
// ============================================

/**
 * Generate monthly invoices for all active subscriptions
 * Called by a cron job at the beginning of each month
 */
export async function generateMonthlyInvoices(): Promise<{
  generated: number
  errors: number
}> {
  let generated = 0
  let errors = 0

  try {
    const now = new Date()

    // Find all active subscriptions that need billing
    const abonamente = await db.abonament.findMany({
      where: {
        status: 'ACTIV',
        dataUrmatoareiFacturi: {
          lte: now,
        },
        plan: {
          pretPerApartament: { gt: 0 }, // Skip FREE plans
        },
      },
      include: {
        organizatie: {
          include: {
            asociatii: {
              include: {
                apartamente: true,
              },
            },
          },
        },
        plan: true,
      },
    })

    console.log(`Found ${abonamente.length} subscriptions to invoice`)

    for (const abonament of abonamente) {
      try {
        // Count apartments
        const apartamente = abonament.organizatie.asociatii.reduce(
          (total, asociatie) => total + asociatie.apartamente.length,
          0
        )

        // Calculate amounts
        const subtotal = Math.max(
          apartamente * abonament.plan.pretPerApartament,
          abonament.plan.pretMinimLunar
        )
        const tva = subtotal * 0.19
        const total = subtotal + tva

        // Generate invoice number
        const invoiceNumber = `FA-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`
        const perioada = now.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })

        // Create draft invoice
        await db.facturaAbonament.create({
          data: {
            abonamentId: abonament.id,
            numar: invoiceNumber,
            dataEmitere: now,
            dataScadenta: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 days
            perioada,
            nrApartamente: apartamente,
            pretUnitar: abonament.plan.pretPerApartament,
            subtotal,
            tva,
            total,
            status: 'DRAFT',
          },
        })

        generated++
        console.log(`Invoice generated for organization: ${abonament.organizatie.nume}`)
      } catch (error) {
        errors++
        console.error(`Error generating invoice for org ${abonament.organizatieId}:`, error)
      }
    }
  } catch (error) {
    console.error('Error in generateMonthlyInvoices:', error)
  }

  return { generated, errors }
}
