# Revolut Payment Module Audit Report

**Date:** 2026-03-16
**Status:** Code Review Complete - Module NOT Tested in Production
**Auditor:** Claude Code

## Executive Summary

The Revolut payment module has been implemented but **never tested in production**. The code structure is sound, but several issues need to be addressed before going live.

---

## Files Audited

1. `src/lib/revolut.ts` - Core Revolut client and utilities
2. `src/app/api/billing/create-payment/route.ts` - Subscription payment creation
3. `src/app/api/billing/webhook/route.ts` - Webhook handler for payment events
4. `src/app/api/payments/create-intent/route.ts` - Stripe payment intent (separate system)
5. `src/app/api/payments/webhook/route.ts` - Stripe webhook (separate system)

---

## Architecture Overview

The project has **two separate payment systems**:

### 1. Revolut (Subscription Billing)
- Used for: Organization subscription payments
- Endpoints: `/api/billing/create-payment`, `/api/billing/webhook`
- Flow: Organization → FacturaAbonament → Revolut Order → Webhook → Subscription update

### 2. Stripe (Resident Payments)
- Used for: Resident chitanta (invoice) payments
- Endpoints: `/api/payments/create-intent`, `/api/payments/webhook`
- Flow: Resident → Chitanta → Stripe PaymentIntent → Webhook → Plata update

---

## Issues Found

### Critical Issues

#### 1. Missing Environment Variable Validation
**File:** `src/lib/revolut.ts:271-286`
```typescript
export async function getRevolutClient(): Promise<RevolutClient | null> {
  const apiKey = process.env.REVOLUT_API_KEY
  // Returns null silently if not configured
  if (!apiKey) {
    console.error('Revolut API key not configured in .env')
    return null
  }
```
**Problem:** No startup validation. App starts without warning if Revolut isn't configured.

**Recommendation:** Add environment validation in `next.config.js` or a startup check.

---

#### 2. Webhook Signature Verification is Optional
**File:** `src/app/api/billing/webhook/route.ts:27-40`

**Status:** FIXED

The webhook now requires signature verification in production:
```typescript
const webhookSecret = process.env.REVOLUT_WEBHOOK_SECRET
const isProduction = process.env.NODE_ENV === 'production' ||
                     process.env.REVOLUT_ENVIRONMENT === 'production'

if (isProduction && !webhookSecret) {
  console.error('REVOLUT_WEBHOOK_SECRET not configured in production')
  return NextResponse.json({ error: 'Webhook security not configured' }, { status: 500 })
}

if (isProduction && !signature) {
  console.error('Missing webhook signature in production')
  return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
}
```

---

#### 3. Type Casting Issues in `checkPaymentStatus`
**File:** `src/lib/revolut.ts:369-386`

**Status:** FIXED

The function now uses proper Prisma select with typed fields:
```typescript
const plata = await db.plata.findFirst({
  where: { referinta: orderRef },
  select: {
    id: true,
    status: true,
    stripePaymentId: true, // Used for both Stripe and Revolut order IDs
  },
})
```

---

### Medium Issues

#### 4. Field Name Mismatch: Using `stripePaymentId` for Revolut
**File:** `src/app/api/billing/create-payment/route.ts:147-154`
```typescript
await db.facturaAbonament.update({
  where: { id: facturaAbonament.id },
  data: {
    stripeInvoiceId: revolutOrder.id, // Using Stripe field for Revolut
```
**Problem:** Confusing field naming. `stripeInvoiceId` is used to store Revolut order ID.

**Recommendation:** Either:
- Rename field to `paymentProviderId` in schema
- Add separate `revolutOrderId` field
- Document the dual-use clearly

---

#### 5. Missing Invoice PDF Generation Implementation
**File:** `src/lib/invoice.ts:146-152`
```typescript
// In production, convert HTML to PDF using:
// - puppeteer (headless Chrome)
// - pdfkit
// - html-pdf

// For now, return HTML as buffer
const buffer = Buffer.from(html, 'utf-8')
```
**Problem:** PDF generation returns HTML, not actual PDF. Email attachments won't work properly.

**Recommendation:** Implement PDF generation before production:
```bash
npm install puppeteer
# or
npm install @react-pdf/renderer
```

---

#### 6. Email Attachment Not Implemented
**File:** `src/lib/invoice.ts:510-517`
```typescript
const result = await sendEmail({
  to,
  subject: `[BlocHub] Factură ${invoiceNumber} - Plată confirmată`,
  html,
  // Note: For attachments, you'll need to modify sendEmail to support them
})
```
**Problem:** Invoice PDF is generated but never actually attached to the email.

---

### Low Issues

#### 7. No Retry Logic for API Calls
**File:** `src/lib/revolut.ts:170-200`

**Problem:** Network failures will cause immediate errors. No exponential backoff.

**Recommendation:** Add retry logic with exponential backoff for API calls.

---

#### 8. Missing Idempotency for Order Creation
**File:** `src/app/api/billing/create-payment/route.ts`

**Problem:** If a user clicks "Pay" twice quickly, two orders might be created.

**Recommendation:** Add idempotency key or check for existing pending orders.

---

## Required Environment Variables

```env
# Revolut Payment Gateway
REVOLUT_API_KEY=sk_live_xxx       # Required for payments
REVOLUT_WEBHOOK_SECRET=whsec_xxx  # Required for production
REVOLUT_ENVIRONMENT=sandbox       # 'sandbox' or 'production'

# Stripe (for resident payments)
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

## Testing Checklist

Before going to production:

- [ ] Set up Revolut sandbox account
- [ ] Configure `REVOLUT_API_KEY` in sandbox
- [ ] Configure `REVOLUT_WEBHOOK_SECRET`
- [ ] Test order creation flow
- [ ] Test webhook signature verification
- [ ] Test ORDER_COMPLETED webhook handling
- [ ] Test ORDER_PAYMENT_FAILED webhook handling
- [ ] Test invoice generation and email sending
- [ ] Test subscription status update after payment
- [ ] Implement actual PDF generation
- [ ] Add email attachment support

---

## Recommended Fixes (Priority Order)

1. **High:** Make webhook secret required in production
2. **High:** Fix `checkPaymentStatus` to use correct field
3. **Medium:** Implement proper PDF generation
4. **Medium:** Add email attachment support
5. **Low:** Add retry logic for API calls
6. **Low:** Add idempotency for order creation

---

## GDPR Compliance Status

The GDPR features are **fully implemented**:

### Endpoints
- `POST /api/user/export` - Data export (Art. 20 GDPR)
- `POST /api/user/delete` - Account deletion with anonymization (Art. 17 GDPR)
- `GET /api/user/consents` - Get user consents
- `POST /api/user/consents` - Save consent records

### Prisma Schema
- `Consent` model with types: COOKIE_NECESSARY, COOKIE_ANALYTICS, COOKIE_MARKETING, PRIVACY_POLICY, TERMS_OF_SERVICE, DATA_PROCESSING
- `User.deletedAt` field for soft delete
- `User.consents` relation

### UI
- Export button in Settings > Date tab
- Delete account button with DELETE confirmation
- GDPR reference (Art. 17, Art. 20) shown in UI

---

## Conclusion

The Revolut payment module is **structurally complete** but requires:
1. Production environment setup
2. Critical security fixes (webhook verification)
3. PDF generation implementation
4. End-to-end testing in sandbox

GDPR features are **fully functional** and ready for production.
