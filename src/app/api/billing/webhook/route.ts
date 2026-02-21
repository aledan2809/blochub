/**
 * API Route: Revolut Webhook Handler
 *
 * Receives webhook notifications from Revolut and:
 * - Updates subscription/invoice status
 * - Generates final invoice PDF on successful payment
 * - Sends confirmation emails
 *
 * POST /api/billing/webhook
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { RevolutClient, RevolutWebhookPayload } from '@/lib/revolut'
import { generateInvoicePDF, sendInvoiceEmail } from '@/lib/invoice'

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()

    // Get signature from header
    const signature =
      request.headers.get('revolut-signature') ||
      request.headers.get('Revolut-Signature')

    // Verify signature if webhook secret is configured
    const webhookSecret = process.env.REVOLUT_WEBHOOK_SECRET
    if (webhookSecret && signature) {
      const revolut = new RevolutClient({
        apiKey: process.env.REVOLUT_API_KEY || '',
        environment: (process.env.REVOLUT_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
        webhookSecret,
      })

      if (!revolut.verifyWebhookSignature(rawBody, signature)) {
        console.error('Invalid webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    // Parse webhook payload
    const payload: RevolutWebhookPayload = JSON.parse(rawBody)
    console.log('Received Revolut webhook:', payload.event, 'Order ID:', payload.order_id)

    // Find invoice by Revolut order ID or merchant reference
    let facturaAbonament = null

    if (payload.merchant_order_ext_ref) {
      facturaAbonament = await db.facturaAbonament.findUnique({
        where: { id: payload.merchant_order_ext_ref },
        include: {
          abonament: {
            include: {
              organizatie: true,
              plan: true,
            },
          },
        },
      })
    }

    if (!facturaAbonament && payload.order_id) {
      facturaAbonament = await db.facturaAbonament.findFirst({
        where: { stripeInvoiceId: payload.order_id },
        include: {
          abonament: {
            include: {
              organizatie: true,
              plan: true,
            },
          },
        },
      })
    }

    if (!facturaAbonament) {
      console.error('Invoice not found for order:', payload.order_id)
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Map Revolut events to invoice/subscription status
    let newInvoiceStatus: 'DRAFT' | 'EMISA' | 'PLATITA' | 'ANULATA' | null = null
    let newSubscriptionStatus: string | null = null
    let dataPlatii: Date | null = null

    switch (payload.event) {
      case 'ORDER_COMPLETED':
        newInvoiceStatus = 'PLATITA'
        newSubscriptionStatus = 'ACTIV'
        dataPlatii = new Date()
        console.log('Payment completed for invoice:', facturaAbonament.id)
        break

      case 'ORDER_PAYMENT_AUTHENTICATED':
        // 3DS authentication completed, payment processing
        console.log('Payment authenticated for invoice:', facturaAbonament.id)
        break

      case 'ORDER_PAYMENT_DECLINED':
      case 'ORDER_PAYMENT_FAILED':
        newInvoiceStatus = 'ANULATA'
        console.log('Payment failed for invoice:', facturaAbonament.id)
        break

      case 'ORDER_CANCELLED':
        newInvoiceStatus = 'ANULATA'
        console.log('Order cancelled for invoice:', facturaAbonament.id)
        break

      case 'REFUND_COMPLETED':
        newInvoiceStatus = 'ANULATA'
        console.log('Refund completed for invoice:', facturaAbonament.id)
        break

      default:
        console.log('Unhandled webhook event:', payload.event)
    }

    // Update invoice if status changed
    if (newInvoiceStatus) {
      await db.facturaAbonament.update({
        where: { id: facturaAbonament.id },
        data: {
          status: newInvoiceStatus,
          dataPlatii,
        },
      })
      console.log('Invoice updated:', facturaAbonament.id, 'Status:', newInvoiceStatus)
    }

    // Update subscription status if payment completed
    if (newSubscriptionStatus) {
      // Calculate next billing date based on cycle
      const abonament = facturaAbonament.abonament
      let nextBillingDate = new Date()

      switch (abonament.ciclulFacturare) {
        case 'LUNAR':
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
          break
        case 'TRIMESTRIAL':
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 3)
          break
        case 'ANUAL':
          nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1)
          break
      }

      await db.abonament.update({
        where: { id: abonament.id },
        data: {
          status: 'ACTIV',
          dataExpirare: nextBillingDate,
          dataUrmatoareiFacturi: nextBillingDate,
          // Clear any downgrade flags
          readOnlyModules: [],
          downgradeSnapshot: null,
          downgradedAt: null,
        },
      })

      // Also update organization status
      await db.organizatie.update({
        where: { id: abonament.organizatieId },
        data: { status: 'ACTIVA' },
      })

      console.log('Subscription updated:', abonament.id, 'Next billing:', nextBillingDate)

      // Generate and send invoice
      if (dataPlatii) {
        try {
          // Generate PDF invoice
          const pdfBuffer = await generateInvoicePDF(facturaAbonament.id)

          // Send invoice by email
          const org = facturaAbonament.abonament.organizatie
          const recipientEmail = org.emailFacturare || org.email

          if (recipientEmail && pdfBuffer) {
            await sendInvoiceEmail({
              to: recipientEmail,
              organizationName: org.nume,
              invoiceNumber: facturaAbonament.numar,
              amount: facturaAbonament.total,
              pdfBuffer,
            })
            console.log('Invoice email sent to:', recipientEmail)
          }
        } catch (invoiceError) {
          console.error('Error generating/sending invoice:', invoiceError)
          // Don't fail the webhook for invoice errors
        }
      }
    }

    return NextResponse.json({
      received: true,
      event: payload.event,
      invoiceId: facturaAbonament.id,
    })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed', details: (error as Error).message },
      { status: 500 }
    )
  }
}

// Note: App Router automatically handles raw body via request.text() — no config needed
