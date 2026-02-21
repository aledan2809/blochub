# BlocHub - Backup Status
**Last Updated**: 2026-02-21
**Session**: Import System + Tester Feedback Implementation (7 Phases)
**Branch**: main (uncommitted — 50 changed/new files)

---

## CURRENT STATUS OVERVIEW

### Recently Completed (Sessions 15–21 Feb 2026)

**7-Phase Implementation from Tester Feedback (Razvan)**

#### Phase 1: Schema Foundation
- New enums: `TipUnitate` (APARTAMENT, PARCARE, BOXA, SPATIU_COMERCIAL, ALTUL), `ImportStatus`, `TipDocumentUnitate`
- Extended `TipContor`: added IMPULS_BMS, REPARTITOR_COSTURI, CALORIMETRU
- New fields on `Apartament`: tipUnitate, tipUnitateCustom, codUnic, nrCadastral, debransamente
- New field on `Contor`: unitateMasura
- New tables: `audit_logs`, `import_sessions`, `documente_unitati`
- Migration via raw SQL (shared Supabase DB — can't use `prisma db push --accept-data-loss`)

#### Phase 2: Core Utilities
- `src/lib/audit.ts` — `logAudit()` function + mandatory note actions
- `src/lib/validations/import-validators.ts` — decimal normalization, cota sum check, duplicate detection
- `src/lib/import/excel-parser.ts` — xlsx parsing + auto-detect column mapping
- `src/lib/import/pdf-parser.ts` — OCR module integration for scanned PDFs
- `src/lib/import/template-generator.ts` — downloadable Excel templates

#### Phase 3: Import API Routes (6 endpoints)
- `POST /api/import/upload` — file upload + parse (Excel/PDF)
- `POST /api/import/[sessionId]/sheet` — switch Excel sheet
- `POST /api/import/[sessionId]/mapping` — save column mapping
- `POST /api/import/[sessionId]/validate` — full dataset validation
- `POST /api/import/[sessionId]/execute` — execute import in transaction
- `GET/DELETE /api/import/[sessionId]` — session management
- `GET /api/templates/download` — Excel template download

#### Phase 4: Import Wizard UI (4-step modal)
- `ImportWizardModal.tsx` — orchestrator with step indicator
- `Step1Upload.tsx` — drag & drop file upload + template downloads
- `Step2Mapping.tsx` — column mapping with auto-detect
- `Step3Validation.tsx` — errors/warnings display with inline edit
- `Step4Confirm.tsx` — final preview + execute + progress

#### Phase 5: Audit Log
- `src/app/dashboard/audit/page.tsx` — filterable audit log viewer (date range, action, entity)
- `src/app/api/audit/route.ts` — paginated audit query
- `src/app/api/audit/export/route.ts` — PDF export with jsPDF
- Sidebar link: "Jurnal Audit" with ClipboardCheck icon
- `logAudit()` integrated into 4 existing CRUD routes (12 operations):
  - `apartamente/route.ts` — POST, PUT, DELETE
  - `proprietari/route.ts` — POST, PUT, DELETE
  - `furnizori/route.ts` — POST, PUT, DELETE
  - `cheltuieli/route.ts` — POST, PUT, DELETE

#### Phase 6: Document Management per Unit
- `POST/GET/DELETE /api/apartamente/[id]/documente` — document CRUD
- `DocumenteUnitatePanel.tsx` — upload/download/delete panel
- Wired into EditApartmentModal (apartment detail view)

#### Phase 7: Enhanced Meters + Unit Types
- `POST /api/apartamente/[id]/contoare/reset` — reset with mandatory note (min 10 chars)
- Edit form: TipUnitate selector (pill buttons), debransamente toggles, "este închiriat" switch
- Contoare section in edit modal: lists all meters with type icons, serie, unitateMasura
- Reset dialog: inline form with new index + mandatory note
- Apartment cards: show unit type label + "Închiriat" badge

### Bug Fixes (Pre-existing)
- Fixed Revolut billing build errors (11 TypeScript issues):
  - Inlined `@aledan/revolut-integration` into `src/lib/revolut.ts` (Turbopack can't resolve `file:` links)
  - Fixed authOptions import paths in 3 files (`admin/settings`, `billing/create-payment`, `api-guards`)
  - Fixed all `session.user.id/role` TypeScript errors across codebase
  - Created 5 missing shadcn/ui components (Label, Switch, Tabs, Select, Separator)
  - Removed deprecated `export const config` from webhook route
  - Fixed `Buffer` type issues in pdf-parser and template-generator

---

## KEY NEW FILES (this implementation)

### Import System
```
src/lib/import/excel-parser.ts          — xlsx parsing + auto-detect mapping
src/lib/import/pdf-parser.ts            — OCR module integration
src/lib/import/template-generator.ts    — Excel template generation
src/lib/validations/import-validators.ts — validation utilities
src/app/api/import/upload/route.ts      — upload endpoint
src/app/api/import/[sessionId]/         — 5 session endpoints
src/app/api/templates/download/route.ts — template download
src/components/dashboard/import/        — 5 wizard components
```

### Audit System
```
src/lib/audit.ts                        — logAudit() + mandatory note config
src/app/api/audit/route.ts              — paginated audit query
src/app/api/audit/export/route.ts       — PDF export
src/app/dashboard/audit/page.tsx        — audit log viewer
```

### Document Management
```
src/app/api/apartamente/[id]/documente/route.ts — doc CRUD
src/components/dashboard/DocumenteUnitatePanel.tsx — doc panel
```

### Meter Reset
```
src/app/api/apartamente/[id]/contoare/reset/route.ts — reset endpoint
```

### UI Components (created)
```
src/components/ui/label.tsx
src/components/ui/switch.tsx
src/components/ui/separator.tsx
src/components/ui/tabs.tsx
src/components/ui/select.tsx
```

### Revolut (inlined)
```
src/lib/revolut.ts — full client inlined from @aledan/revolut-integration
src/lib/api-guards.ts — auth guards for billing routes
```

---

## MODIFIED FILES (existing)
```
prisma/schema.prisma                     — 3 new enums, 3 new models, extended fields
src/app/api/apartamente/route.ts         — logAudit + tipUnitate/debransamente in PUT
src/app/api/proprietari/route.ts         — logAudit integration
src/app/api/furnizori/route.ts           — logAudit + session auth
src/app/api/cheltuieli/route.ts          — logAudit integration
src/app/dashboard/apartamente/page.tsx   — Import button, edit form (TipUnitate, debransamente, contoare, documents)
src/app/dashboard/layout.tsx             — "Jurnal Audit" sidebar link
src/app/api/admin/settings/route.ts      — fixed import path + session types
src/app/api/billing/create-payment/route.ts — fixed import path + session types
src/app/api/billing/webhook/route.ts     — removed deprecated config export
src/app/admin/settings/page.tsx          — fixed session.user.role cast
```

---

## DATABASE CHANGES (via raw SQL)
```sql
-- New enums
CREATE TYPE "TipUnitate" AS ENUM (...)
CREATE TYPE "ImportStatus" AS ENUM (...)
CREATE TYPE "TipDocumentUnitate" AS ENUM (...)
-- Extended enum
ALTER TYPE "TipContor" ADD VALUE 'IMPULS_BMS' / 'REPARTITOR_COSTURI' / 'CALORIMETRU'
-- New columns on apartamente
tipUnitate, tipUnitateCustom, codUnic (unique, backfilled UUIDs), nrCadastral, debransamente
-- New column on contoare
unitateMasura
-- New tables
audit_logs (with indexes), import_sessions, documente_unitati
```

---

## TODO / NEXT STEPS

### Completed
- [x] Import system (7 API routes + 4-step wizard UI)
- [x] Audit trail (logAudit in all CRUD + audit page + PDF export)
- [x] Document management per unit
- [x] Enhanced meters (new types, unitateMasura, reset with note)
- [x] TipUnitate selector (Apartament/Parcare/Boxă/Spațiu comercial/Altul)
- [x] Debranșamente toggles
- [x] Fixed all Revolut billing build errors
- [x] Build passes cleanly (92+ routes, 0 errors)

### Needs Testing
- [ ] Import wizard: upload Excel → mapping → validate → import
- [ ] Import wizard: PDF via OCR
- [ ] Audit log page: filters, pagination, PDF export
- [ ] Document upload/download per unit
- [ ] Meter reset with mandatory note
- [ ] TipUnitate/debranșamente save correctly

### Future
- [ ] MANUAL distribution (Repartizare UI)
- [ ] Revolut payment button in Avizier
- [ ] Payment success/cancel pages
- [ ] OCR service deployment (currently localhost:8000)

---

## TECHNICAL STACK

### Frontend
- **Framework**: Next.js 16.1 (App Router)
- **Language**: TypeScript 5.9
- **UI**: React 19, Tailwind CSS 4
- **Components**: shadcn/ui (custom implementations)
- **Export**: jsPDF + autotable, xlsx

### Backend
- **API**: Next.js API Routes
- **Database**: PostgreSQL (Supabase, shared DB)
- **ORM**: Prisma 6
- **Auth**: NextAuth.js
- **Payments**: Revolut Merchant API (inlined client)
- **OCR**: External service at localhost:8000

---

## PORT & LOCATION

- **Port**: 3004
- **URL**: http://localhost:3004
- **Location**: C:\Projects\blochub
- **GitHub**: https://github.com/aledan2809/blochub.git
- **Build**: `prisma generate && next build --experimental-build-mode=compile`

---

**END OF BACKUP STATUS**
