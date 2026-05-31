# TRUE E2E Full Audit — blochub (BlocX)

**Date:** 2026-05-31 · **Branch:** `main` @ `2ca714e` · **Mode:** [10] True E2E Full Audit (Max-Speed) · **Classification:** NO-TOUCH CRITIC (payment flows) → **AUDIT-ONLY** (zero auto-fix; all fixes via propose-confirm-apply per CLASSIFICATION §2d)

## Scope-vs-completed matrix

| Phase | Status | Result |
|---|---|---|
| 0 · `/review` baseline | ✅ done | 1× P1 (create-intent IDOR) + P2/P3 |
| 1 · Pre-reqs (gaps/accounts/fixtures) | ⚠️ partial | admin account OK; **no onboarded asociație** on test acct → deep-workflow live exec blocked (prod NO-TOUCH writes not performed) |
| 2 · [7] E2E CODE audit | ✅ done | composite 62/100 (2 false-positive low scores) — `Reports/AUDIT_E2E_2026-05-30.md` |
| 3 · [8] Journey audit | ✅ done | 14 OK / 3 GATED(onboarding) / 0 errors / 0 crashes — `journey-audit-results/blochub/` |
| 4 · TRWG-GW (Tester-Gateway) | ⚠️ config done, run deferred | `Tester-Gateway/apps/blochub.json` **created**; runtime run blocked (running-TG token mismatch + likely Vision credit block); browser walk already covered by Phase 3 |
| 5 · TWG / triage | ✅ done (audit-only) | findings documented as G-BLOC-* gaps; NO auto-fix (NO-TOUCH) |
| 6 · Workflow scenarios | ⚠️ code-level only | chain verified by code read; live exec blocked (no onboarded tenant) |
| 7 · Concurrency | ✅ code-level | financial hot paths non-transactional (P1) |
| 8 · Browser-real role-play | ⚠️ partial | ADMIN walked (journey); PROPRIETAR/SUPER_ADMIN deferred (missing test accounts + fixtures) |
| 9 · Parity (multi-tenant isolation) | ✅ code-level | 3 confirmed IDORs vs 9 correctly-scoped routes |
| 10 · Stress + audit trail | ✅ partial | load-tester 100/100; audit-trail coverage gaps (P1) |

**Honest coverage note:** This run is **code-level + production-HTTP-level**. Live multi-role workflow execution (Phase 6/8 deep) and the TG runtime loop were **not** performed because they require (a) seeding fixture data into a live NO-TOUCH prod DB and (b) provisioning PROPRIETAR/SUPER_ADMIN test accounts — both deferred to dedicated propose-confirm sessions. Findings below are verified by reading the route handlers + Prisma usage + live HTTP/cert probes, not by exploiting prod.

---

## 🔴 URGENT — confirmed, time-critical

### G-BLOC-001 · SSL cert renewal FAILING → prod outage ~2026-06-16 · P1 · INFRA
- **Confirmed live** (certbot `--dry-run`): `The Certificate Authority failed to download the temporary challenge files... Failed to renew certificate blocx.ro`. Timer is active (ran 2026-05-30 23:15) but every renewal fails. Cert valid **16 days** (expires 2026-06-16 16:15 UTC).
- **Root cause (pinned):** renewal authenticator is `webroot` (`/var/www/html`), but the blocx.ro **port-80 nginx vhost does `return 301 https://blocx.ro$request_uri` for ALL paths**, including `/.well-known/acme-challenge/`. The http-01 challenge gets redirected to HTTPS → which proxies to the Next.js app (no acme route) → 404 → challenge fails. Live probe: `http://blocx.ro/.well-known/acme-challenge/test → 301 → https`.
- **Fix (surgical, low-risk):** add to the `:80` server block, **before** the redirect:
  ```nginx
  location ^~ /.well-known/acme-challenge/ {
      root /var/www/html;
      default_type "text/plain";
      try_files $uri =404;
  }
  ```
  then `nginx -t && systemctl reload nginx && certbot renew --cert-name blocx.ro`.
- **Status:** OPEN — **prod nginx change on NO-TOUCH host → propose-confirm-apply.** Offered to user 2026-05-31.

---

## P1 — confirmed (NO-TOUCH payment/data surface → dedicated fix sessions)

### G-BLOC-002 · IDOR: `apartamente/[id]/documente` cross-tenant read/write/delete · P1 · SECURITY
- GET `db.documentUnitate.findMany({where:{apartamentId:id}})` — only checks session exists, **no asociație-ownership check**. Any authenticated user can read any apartment's documents. POST verifies apartment *exists* but not ownership (cross-tenant attach). DELETE same. `middleware.ts` only enforces auth + SUPER_ADMIN-on-/admin — does NOT mitigate.
- **Impact:** cross-tenant disclosure (contracts/IDs), write, and destructive delete. cuid IDs lower (not eliminate) blast radius.

### G-BLOC-003 · IDOR: `apartamente/[id]/contoare/reset` cross-tenant meter reset · P1 · SECURITY/INTEGRITY
- Guard is `if (!contor || contor.apartamentId !== apartamentId)` — checks meter↔apartment link, **never** that the apartment belongs to the caller's asociație. An authenticated user from tenant A can reset (zero) any meter in tenant B → directly corrupts CONSUM billing math.

### G-BLOC-004 · IDOR: `payments/create-intent` no chitanță ownership check · P1 · SECURITY · NO-TOUCH
- `db.chitanta.findUnique({where:{id:chitantaId}})` with no link to the session user's apartment/asociație. Authenticated user can create a Stripe PaymentIntent + `PENDING Plata` against another tenant's invoice. (Resident read path `/api/portal/chitante` IS correctly scoped — only the write path leaks.)

### G-BLOC-005 · Non-atomic financial hot paths → duplicate receipt numbers / partial billing · P1 · CONCURRENCY · NO-TOUCH
- `$transaction` exists in only 3 places (`user/delete`, `user/consents`, `import/execute`) — **none in financial paths**.
- `incasari` (POST): reads `asociatie.ultimulNumarChitanta` → separate `update(+1)` → `plata.create` → `aggregate` → `chitanta.update(status)`, all non-atomic. Two concurrent cash payments → **duplicate official receipt numbers** (`numarChitantaIncasare`); mid-failure leaves burned counter / stale status.
- `chitante/generate`: `findUnique`-then-`create` loop, no transaction → concurrent runs race the `@@unique([asociatieId,apartamentId,luna,an])` (one 500s) or partially generate; `numar` counter non-atomic → duplicate chitanță numbers.

### G-BLOC-006 · Repartizare partial-run distribution mismatch · P1 · FINANCIAL CORRECTNESS
- `src/agents/calcul-chitanta.ts`: `totalCota`/`totalPersoane` aggregate over ALL apartments, but the per-apartment loop / `apartamente.length` use the filtered subset. On a subset regeneration: COTA_INDIVIZA/PERSOANE under-bill, APARTAMENT over-bills → full expense never fully distributed. Asociația systematically under/over-recovers money.

### G-BLOC-007 · Audit trail missing on most sensitive mutations · P1 · COMPLIANCE/ACCOUNTABILITY
- `logAudit()` (→ `AuditLog`) is wired in only ~7 of ~45 mutating routes. **Not logged:** payment record/delete (`incasari`), asociație create/delete, role/user changes (`admin/users`), platform settings (`admin/settings`). The single most fraud-sensitive ops (recording/reversing money) leave no trail. (`AgentLog` is separate AI telemetry, not the human audit log.) `logAudit` accepts `ipAddress` but no caller supplies it → always null.

---

## P2

- **G-BLOC-008** · `scari` GET cross-tenant structure enumeration — GET uses client-supplied `asociatieId` with no admin-ownership gate (POST/DELETE on same route DO check). Cross-tenant structural disclosure.
- **G-BLOC-009** · Repartizare rounding penny-leak — per-line `Math.round` with no residual allocation; `Σ shares ≠ cheltuiala.suma`. Monetary fields are `Float`, not `Decimal`.
- **G-BLOC-010** · Stripe/Revolut webhook status recompute non-atomic / not transaction-guarded against retry interleave (signatures ARE verified — see verified-OK).
- **G-BLOC-011** · a11y color-contrast (5 instances on `/`) + mobile touch targets 15/21 <44px on `/` (landing). Recurring 4PRO-ecosystem pattern.
- **G-BLOC-012** · `/roata` promo: per-spin throttle/cooldown enforced client-side (localStorage) only — server has no per-identity spin throttle, so a determined user can loop `POST /api/roata/spin` until tier 12, then claim. The 12-month **count** cap holds server-side but its check+create is non-atomic (TOCTOU, can overshoot cap by a few).

## P3

- **G-BLOC-013** · Hardcoded legal values in `/regulament` + `/privacy` (CUI/reg/sediu/DPO) instead of runtime fetch from Legal hub (matches handoff "fresh item 2"; static-review also flagged regulament:11). Drift risk if Legal entity data changes.
- **G-BLOC-014** · `/api/billing/webhook` returns 500 (not 400) on unsigned POST; CONSUM billing silently charges 0 when prior meter index missing (under-recovers utility cost).

---

## ✅ Verified-correct (checked, no action)

- **Auth works end-to-end** — journey login + 14 authenticated pages render. (`auth-resolver: 20` in [7] is a **plugin false-positive** — NextAuth hydration limitation + no ADMIN creds in `blochub.env`, NOT a real auth bug.)
- **Legal proxy URLs correct** — `consent/document`→`/api/v1/public/legal/{app}/{type}`, `consent/status`→`/api/v1/public/consent-status`, `consent/record`→`/api/v1/consents/record` (signed). 3ceed14 fix verified; Legal proxy returns 200.
- **Entity rename complete** — `Class RDA Impex SRL` (CUI 29867320) across /privacy /terms /gdpr; all `@4pro.io`→`@blocx.ro`; zero `TechBiz`/`4pro.io` leftovers in legal surfaces.
- **Webhook signature verification present** — Stripe (`constructEvent` + `STRIPE_WEBHOOK_SECRET`) and Revolut (`verifyWebhookSignature` + idempotency guards) both verify + reject unsigned in prod.
- **Subscription payment (`billing/create-payment`) correctly guarded** — session + `utilizatorOrganizatie` membership (OWNER/ADMIN) + active check + server-computed amount. Rate-limiting present on payment routes.
- **9/12 sampled tenant routes correctly scoped** by `findFirst({where:{id, adminId}})`.
- **load-tester 100/100, multi-browser 100/100, infra-checker 95/100.**

## ❌ False positives dismissed (no action)

- security-scanner "hardcoded password" ×7 in `src/modules/i18n/locales/*.ts` → translation labels (`password: 'Parolă'`), not credentials.
- `db-verifier: 0` → blochub DB is `127.0.0.1` on VPS2, unreachable from audit host (no `--db-url`); not a real failure.
- `/api/ai` 501 → intentional stub (`'AI router not configured'`); 501 is semantically correct.
- `dangerouslySetInnerHTML` in `layout.tsx:79` → static JSON-LD `SoftwareApplication` schema, no user input.

---

## Role coverage matrix

| Role | Coverage | Method |
|---|---|---|
| ADMIN (asociație owner) | ✅ | journey walk (14 pages) + code review |
| PROPRIETAR (owner/resident) | ⚠️ code-only | portal routes read as membership-scoped; no live account exercised |
| SUPER_ADMIN | ⚠️ code-only | middleware `/admin` gate verified; no live account |

## Recommended fix sessions (propose-confirm-apply, NO-TOUCH §2d)

1. **NOW / urgent** — G-BLOC-001 cert (nginx acme-challenge location) — 1 surgical change, prevents Jun 16 outage.
2. **Security session** — G-BLOC-002/003/004/008 IDOR cluster (add asociație-ownership scope to documente, contoare/reset, create-intent, scari GET).
3. **Financial-integrity session** — G-BLOC-005 (wrap incasari + generate in `$transaction`, atomic counters) + G-BLOC-006/009 (repartizare subset denominators + residual rounding; consider `Decimal`).
4. **Compliance session** — G-BLOC-007 audit-trail coverage on payments / asociație lifecycle / role+settings.
5. **Polish** — G-BLOC-011 a11y/mobile, G-BLOC-012 roata server-throttle, G-BLOC-013 Legal-hub fetch.

## Artifacts
- [7] CODE: `blochub/Reports/AUDIT_E2E_2026-05-30.md`
- [8] Journey: `blochub/journey-audit-results/blochub/{report.json,screenshots/}`
- TG config: `Tester-Gateway/apps/blochub.json`
