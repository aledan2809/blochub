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
| G-BLOC-015 | P1 | Onboarding/Auth | Proprietar invite acceptance BROKEN: `middleware.ts:51` auth-gates public `/api/invitations/accept` (GET verify + POST accept) → logged-out invitee bounced to `/api/auth/signin` → "Invitație Invalidă". Entire proprietar invite onboarding non-functional in prod. | OPEN | New-user journey 2026-06-02. GET handler is explicitly `// (public)` + no `getServerSession`; matcher comment says "exclude public ones" but `/accept` wasn't excluded. **Fix (confirm):** carve `/api/invitations/accept` out of matcher (negative pattern / public sub-path). NOT applied — middleware = global auth, sensitive. Evidence: `proprietar/01-invite-landing.png` + curl 302→signin. |
| G-BLOC-016 | P2 | Onboarding/UX | Guided 4-step `SetupWizard` (`dashboard/page.tsx:638`, auto-creates asociatie+scări+apartamente) has ZERO usages → orphaned dead code; new admin gets bare "adaugă prima clădire" empty-state instead. | OPEN | New-user journey 2026-06-02. grep confirms no `<SetupWizard` anywhere in `src/`. Reconnecting it would remove most admin onboarding friction. |
| G-BLOC-017 | P2 | Onboarding/UX | Misleading first-step label: modal titled "Adaugă prima **clădire**" (`layout.tsx` AddBuildingModal) collects 4 *association* fields + POSTs `/api/asociatii` (creates asociație, not clădire). | OPEN | New-user journey 2026-06-02. Confusing for new admin; rename to "Creează asociația". |
| G-BLOC-018 | P2 | UX/robustness | Data pages (`/dashboard/cheltuieli` et al.) render an infinite loading spinner for an admin with no association, instead of a "configure association first" gate/redirect. | OPEN | New-user journey 2026-06-02. Evidence: `admin/12-motor-cheltuieli.png`. |
| G-BLOC-019 | P2 | Routing/UX | PROPRIETAR post-login lands on `/dashboard` (admin empty-state) instead of `/portal`. | OPEN | New-user journey 2026-06-02. Evidence: portal walk "after login url=/dashboard". |
| G-BLOC-020 | P3 | Auto-explicability | Proprietar sees the total but not WHY: per-line `detaliiJson` breakdown is computed+stored but NOT exposed by `/api/portal/chitante` (only category subtotals); `/portal/payments` shows only `sumaTotal`; avizier "Defalcare pe Categorii" renders empty. | OPEN | New-user journey 2026-06-02. `api/portal/chitante/route.ts:60-78` mapping omits `detalii`; `proprietar/CLEAN-avizier.png`. **Fix (confirm):** add `detalii` to API + render breakdown. |
| G-BLOC-021 | P3 | Data integrity | Hardcoded mock meter data renders in production portal (`portal/page.tsx:42-44`: Apă rece 245 / Apă caldă 87 / Gaz 1250 mc) regardless of real readings. | OPEN | New-user journey 2026-06-02. Evidence: `proprietar/11-portal-portal.png`. |
| G-BLOC-022 | P3 | Onboarding/UX | First-login gamification "Nivel nou! Începător" overlay + cookie banner stack over the dashboard, obscuring onboarding. Celebrates a "level up" before any action. | OPEN | New-user journey 2026-06-02. Evidence: `admin/06-after-login.png`. |
| G-BLOC-023 | P3 | UX/clarity | Avizier "Sumar Cheltuieli" omits the Fonduri category → math looks inconsistent (categories show 60 but Total General 120; the 60 fonduri isn't itemized). | OPEN | New-user journey 2026-06-02. Evidence: `proprietar/CLEAN-avizier.png`. |
| G-BLOC-024 | P3 | Financial correctness | Regenerating chitanțe for the same lună/an creates a NEW chitanță (numar 1→3) + rolls prior total into restanță, instead of replacing the month's bill → duplicate bills + inflated restanță. | OPEN | New-user journey 2026-06-02. May relate to G-BLOC-005 generate-atomicity. Evidence: `/tmp/gen-chit.log` (numar 1→3, restanta 0→30→60). |
| G-BLOC-025 | P3 | UX | `POST /api/cheltuieli` rejects with "Furnizorul este obligatoriu" — new admin can't log a simple expense without first creating a supplier; no inline quick-add observed. | OPEN | New-user journey 2026-06-02. |
| G-BLOC-026 | P3 | Robustness | Login React hydration race (recurrence of G-JOURNEY-LOGIN-001): submit before hydration (`domcontentloaded`) bounces to `/auth/login?callbackUrl`; `networkidle` works. Affects tooling + fast users on slow links. | OPEN | New-user journey 2026-06-02. |

---

## Reports index

- `Reports/AUDIT-<date>.md` — individual audit reports
- `Reports/DIRECT-CHANGES-YYYY-MM.md` — monthly Direct-session change log
