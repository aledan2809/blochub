# Audit Gaps — blochub

**Project safety**: NO-TOUCH CRITIC for payment flows (`src/app/api/payments/*`) per `Master/CLASSIFICATION.md` §4 — prod live at `blocx.ro` (VPS2)
**Last updated**: 2026-04-24
**Maintainer**: Master orchestration (auto-surface at session start)

---

## Permanent instruction — Claude session start

At the start of every session opened on this project:
1. Read this file in full
2. Surface all items with `Status=OPEN` to the user
3. NEVER apply automated fix on payment/billing code — pipeline mode is `audit-only` per Master `CLAUDE.md` §2d
4. For any proposed change in payment/billing: `propose-confirm-apply` protocol (describe change → wait for explicit "ok" → apply → log in `Reports/DIRECT-CHANGES-YYYY-MM.md`)
5. After each resolved item: update `Status=Eliminated` with date + commit hash

**Why**: BlocHub handles HOA financial flows through Revolut Merchant API. Payment regressions translate directly to missed revenue and regulatory exposure. See `@aledan/revolut-integration` consumer chain.

---

## Open Gaps

_Populated 2026-05-31 by True E2E Full Audit [10] — see `Reports/TRUE-E2E-FULL-2026-05-31.md`. All findings AUDIT-ONLY (NO-TOUCH CRITIC); fixes via propose-confirm-apply per Master `CLAUDE.md` §2d._

| Gap ID | Severity | Area | Description | Status | Resolution |
|--------|----------|------|-------------|--------|------------|
| G-BLOC-001 | P1 | Infra/TLS | SSL cert renewal FAILING — port-80 nginx 301-redirect swallows webroot acme-challenge; blocx.ro expires 2026-06-16 (~16d). Surgical fix: add acme-challenge location to :80 block. | ✅ Eliminated 2026-05-31 | Added `location ^~ /.well-known/acme-challenge/` (webroot `/var/www/html`) + wrapped server-level `return 301` into `location /` in `/etc/nginx/sites-available/blocx.ro` :80 block. `nginx -t` OK + reload. `certbot renew --force-renewal` succeeded → cert Jun 16 → **Aug 28 2026 (89d)**; nginx reloaded serves new cert; blocx.ro 200. Auto-renew now functional (permanent fix). Backups `.bak-2026-05-31-acme`/`-acme2`. Ledger: DIRECT-CHANGES-2026-05. |
| G-BLOC-002 | P1 | Security/IDOR | `apartamente/[id]/documente` GET/POST/DELETE lack asociație-ownership check → cross-tenant doc read/write/delete | ✅ Eliminated 2026-05-31 (`95f7bf1`, deployed) | Added `asociatie.adminId` ownership scope to GET/POST/DELETE (findFirst). Build+deploy OK; journey re-audit 14 OK (admin legit access preserved). |
| G-BLOC-003 | P1 | Security/IDOR | `apartamente/[id]/contoare/reset` checks meter↔apt link but not caller ownership → cross-tenant meter reset (corrupts CONSUM billing) | ✅ Eliminated 2026-05-31 (`95f7bf1`, deployed) | Added apartment-ownership check (asociatie.adminId) before reset. |
| G-BLOC-004 | P1 | Security/IDOR (payments NO-TOUCH) | `payments/create-intent` no chitanță-ownership check → PaymentIntent + PENDING Plata on another tenant's invoice | ✅ Eliminated 2026-05-31 (`95f7bf1`, deployed) | Caller must be active proprietar of the apartment OR asociație admin; else 404. |
| G-BLOC-005 | P1 | Concurrency (payments NO-TOUCH) | Financial hot paths (`incasari`, `chitante/generate`, webhooks) not transaction-wrapped → duplicate official receipt numbers + partial billing | 🟡 Partial 2026-05-31 (`84ce0c5`, deployed) | `incasari` cash receipt-number now atomic (`increment`+return) → duplicate-receipt race eliminated. **Remaining**: full `$transaction` wrap of `chitante/generate` + numar race + webhook recompute — DEFERRED (admin-only, `@@unique` guards; needs careful txn restructure). |
| G-BLOC-006 | P1 | Financial correctness | Repartizare partial-run: totals aggregate over ALL apts but loop uses subset → bills don't sum to expense total | ✅ Eliminated 2026-05-31 (`84ce0c5`, deployed) | APARTAMENT mode divides by full `db.apartament.count({asociatieId})`, not subset `apartamente.length` → per-apt share identical on full/subset regen. |
| G-BLOC-007 | P1 | Compliance/Audit | Audit trail missing on payments record/delete, asociație create/delete, role/user/settings changes | 🟡 Partial 2026-05-31 (`84ce0c5`, deployed) | Added `logAudit` for INREGISTRARE_PLATA, STERGERE_PLATA, STERGERE_ASOCIATIE (wrapped fire-safe). **Remaining**: role/user (`admin/users`) + settings (`admin/settings`) + asociație create logging — DEFERRED. |
| G-BLOC-008 | P2 | Security | `scari` GET uses client `asociatieId` with no admin gate → cross-tenant structure enumeration | ✅ Eliminated 2026-05-31 (`95f7bf1`, deployed) | Added `asociatie.adminId` ownership check on GET (POST/DELETE already had it). |
| G-BLOC-009 | P2 | Financial correctness | Repartizare rounding penny-leak (no residual allocation); monetary fields `Float` not `Decimal` | OPEN — DEFERRED | Large money-math refactor (Float→Decimal + largest-remainder residual allocation); needs unit tests. Dedicated session — not rushed on live NO-TOUCH. |
| G-BLOC-010 | P2 | Concurrency (payments NO-TOUCH) | Stripe/Revolut webhook status recompute non-atomic vs retry interleave (signatures ARE verified) | OPEN — DEFERRED | Webhook NO-TOUCH core; low risk (signatures + idempotency guards present). Bundle with G-BLOC-005 generate-txn session. |
| G-BLOC-011 | P2 | a11y/mobile | Color-contrast (5 instances on `/`) + 15/21 mobile touch targets <44px on landing | OPEN — DEFERRED | UI work needing visual verification (recurring 4PRO pattern); focused UI pass. |
| G-BLOC-012 | P2 | Promo integrity | `/roata` spin throttle/cooldown client-side only; claim cap check+create non-atomic (TOCTOU) | 🟡 Partial 2026-05-31 (`84ce0c5`, deployed) | Added server-side IP throttle (10/min) on `/api/roata/spin` to deter spin-to-best-tier loops. Claim-cap TOCTOU (sub-minor, cap=20) left OPEN. |
| G-BLOC-013 | P3 | Maintainability | Hardcoded legal values in `/regulament` + `/privacy` instead of Legal-hub runtime fetch | OPEN — DEFERRED | Requires touching **Legal** (2nd NO-TOUCH project — violates one-NO-TOUCH-per-session) + exposing `registrationNumber` in Legal public API. Dedicated cross-project session (= handoff "fresh items 1+2"). |
| G-BLOC-014 | P3 | Robustness | `/api/billing/webhook` 500 (not 400) on unsigned; CONSUM silently bills 0 when prior index missing | OPEN — DEFERRED | Low value/risk; webhook NO-TOUCH core. Bundle with webhook session. |
| G-BLOC-015 | P1 | Onboarding/Auth | Proprietar invite acceptance BROKEN: `middleware.ts:51` auth-gates public `/api/invitations/accept` → logged-out invitee bounced to `/api/auth/signin` → "Invitație Invalidă". Proprietar onboarding non-functional. | ✅ Eliminated 2026-06-02 (`d2b458c`, deployed) | `authorized` callback now returns true for `/api/invitations/accept` (the invitee has no session yet); rest stays gated. **Verified live**: bogus token → `404 {"error":"Invitație invalidă"}` (reaches handler, no signin redirect); valid token → `200 {"valid":true, invitation:{...}}` unauthenticated. Full invite flow restored. |
| G-BLOC-016 | P2 | Onboarding/UX | Guided 4-step `SetupWizard` (`dashboard/page.tsx:638`) had ZERO usages → orphaned; new admin got bare "adaugă prima clădire" empty-state. | ✅ Eliminated 2026-06-02 (`d2b458c`, deployed) | Empty-state branch now renders `<SetupWizard />`; wizard sets `currentAsociatieId` before reload so the new association auto-selects (AsociatieContext auto-selects first). |
| G-BLOC-017 | P2 | Onboarding/UX | Misleading: modal titled "Adaugă prima **clădire**" (AddBuildingModal) creates an *association* (POSTs `/api/asociatii`). | ✅ Eliminated 2026-06-02 (`d2b458c`, deployed) | Renamed both sidebar buttons + modal title → "Creează prima asociație" / "Adaugă asociație nouă". Real building-add on Clădire page untouched. |
| G-BLOC-018 | P2 | UX/robustness | Data pages rendered an infinite spinner for an admin with no association (fetch early-returns, loading stays true). | ✅ Eliminated 2026-06-02 (`d2b458c`, deployed) | Layout-level redirect guard: `!asocLoading && !currentAsociatie && pathname !== '/dashboard'` → `router.replace('/dashboard')` (where the wizard shows). Fixes all data pages. |
| G-BLOC-019 | P2 | Routing/UX | PROPRIETAR post-login landed on `/dashboard` (admin empty-state) instead of `/portal`. | ✅ Eliminated 2026-06-02 (`d2b458c`, deployed) | Middleware redirects `PROPRIETAR` off `/dashboard*` → `/portal`. |
| G-BLOC-020 | P3 | Auto-explicability | Proprietar saw the total but not WHY: per-line `detaliiJson` breakdown not exposed by `/api/portal/chitante`; payments showed only `sumaTotal`. | ✅ Eliminated 2026-06-02 (`d2b458c`, deployed) | `/api/portal/chitante` now returns parsed `detalii`; `/portal/payments` renders the line breakdown + Fonduri/Restanță/Penalizări sub-amounts per chitanță. |
| G-BLOC-021 | P3 | Data integrity | The ENTIRE portal home was hardcoded demo mock (balance, recent receipts, meters, "Ion Popescu/Apt 42"). | ✅ Eliminated 2026-06-02 (`d2b458c`, deployed) | `portal/page.tsx` rewritten as client component fetching real `/api/portal/chitante` (real name/apartment/balance/recent receipts); fake meter indexes removed (kept the "Trimite indexi" CTA). |
| G-BLOC-022 | P3 | Onboarding/UX | First-login gamification "Nivel nou! Începător" overlay buried onboarding (celebrated the free baseline level). | ✅ Eliminated 2026-06-02 (`d2b458c`, deployed) | `LevelUpCelebration` now persists the baseline silently on first sight and celebrates only genuine level-ups (current idx > stored idx). |
| G-BLOC-023 | P3 | UX/clarity | Avizier "Sumar Cheltuieli" omitted the Fonduri category → 60 shown vs 120 total looked inconsistent. | ✅ Eliminated 2026-06-02 (`d2b458c`, deployed) | Added a "Total Fonduri" card (data already in `totaluri.fonduri`). |
| G-BLOC-024 | P3→corrected | Financial correctness | **Reclassified after code read**: NO DB duplication (the generate route dedups via update-if-exists; count stayed 2). Real bug = the restanță query in `calcul-chitanta` didn't exclude the period being generated, so regenerating a month counted that month's own unpaid chitanță as a prior restanță → inflation (observed 0→30→60). | ✅ Eliminated 2026-06-02 (`d2b458c`, deployed) | Restanță `chitante` include now filters strictly-prior periods: `OR: [{an:{lt:an}}, {an, luna:{lt:luna}}]`. |
| G-BLOC-025 | P3 | UX | `POST /api/cheltuieli` rejected with "Furnizorul este obligatoriu" — couldn't log a simple expense without a supplier. | ✅ Eliminated 2026-06-02 (`d2b458c`, deployed) | Removed the mandatory check; `furnizorId` now nullable on create (model field is already optional). |
| G-BLOC-026 | P3 | Robustness | Login React hydration race (G-JOURNEY-LOGIN-001 recurrence): pre-hydration submit bounced to `/auth/login?callbackUrl`. | ✅ Eliminated 2026-06-02 (`d2b458c`, deployed) | Submit button `disabled={!mounted}` (SSR-disabled until React hydrates) + `handleSubmit` guards `if (!mounted) return`. journey-audit 14 OK/3 GATED (no regression). |

---

## Reports index

- `Reports/AUDIT-<date>.md` — individual audit reports
- `Reports/DIRECT-CHANGES-YYYY-MM.md` — monthly Direct-session change log
