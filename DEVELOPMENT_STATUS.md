# Project Status - BlocHub

Last Updated: 2026-03-16

## Current State

### GDPR Features (NEW)
- [x] Consent model added to Prisma schema (ConsentType enum)
- [x] User soft-delete with `deletedAt` field
- [x] POST /api/user/export - GDPR data export endpoint
- [x] POST /api/user/delete - GDPR account deletion with anonymization
- [x] GET/POST /api/user/consents - Consent management endpoints
- [x] Cookie banner updated to save consents to server
- [x] Settings page "Date" tab updated with GDPR export/delete buttons

### Payments Integration Status

#### Revolut Integration (Subscription Billing)
- Located in: `src/lib/revolut.ts`, `@aledan/revolut-integration`
- API Routes:
  - `/api/billing/create-payment` - Creates Revolut payment orders
  - `/api/billing/webhook` - Handles Revolut webhooks
- Status: **UNTESTED** - Module exists but never tested with Revolut sandbox
- Note: The `@aledan/revolut-integration` package is a local package at `../revolut-integration`

#### Stripe Integration (Chitanță Payments)
- Located in: `src/lib/stripe.ts`
- API Routes:
  - `/api/payments/create-intent` - Creates Stripe payment intents
  - `/api/payments/webhook` - Handles Stripe webhooks
- Status: **Fixed** - Changed to lazy initialization to not throw on missing STRIPE_SECRET_KEY

### Pre-existing Issues Found

1. **GoogleAnalytics Component** (src/components/GoogleAnalytics.tsx)
   - Uses `useSearchParams` without Suspense boundary
   - Causes build error: "Cannot read properties of null (reading 'useContext')"
   - This is a pre-existing issue, not caused by current changes

2. **Jest Testing Types**
   - Test files missing jest-dom types
   - Pre-existing issue in test files

## TODO

- [ ] Run prisma migrate to create `consents` table and add `deletedAt` to users
- [ ] Test Revolut integration with sandbox environment
- [ ] Fix GoogleAnalytics component (wrap with Suspense)

## Recent Changes

- [2026-03-16]: Added GDPR consent tracking (Consent model, ConsentType enum)
- [2026-03-16]: Added User.deletedAt for GDPR soft delete
- [2026-03-16]: Created /api/user/export endpoint for GDPR data export
- [2026-03-16]: Created /api/user/delete endpoint for GDPR account deletion
- [2026-03-16]: Created /api/user/consents endpoint for consent management
- [2026-03-16]: Updated CookieConsentBanner to save consents to server
- [2026-03-16]: Updated Settings page with GDPR export/delete buttons
- [2026-03-16]: Fixed Stripe lib to use lazy initialization

## Technical Notes

### Revolut Integration Architecture
The project uses two separate payment integrations:
1. **Revolut** - For subscription billing (associated with BlocHub SaaS plans)
2. **Stripe** - For chitanță (receipt) payments from apartment owners

The Revolut integration uses webhooks to handle:
- `ORDER_COMPLETED` - Payment successful
- `ORDER_PAYMENT_FAILED` - Payment failed

Webhook endpoint: `/api/billing/webhook`

### GDPR Compliance Notes
- Data export includes: profile, apartments, payments, tickets, notifications, consents
- Account deletion performs soft-delete and anonymizes personal data
- Deleted users are blocked from creating new associations
- Consent records include IP and user agent for audit trail
