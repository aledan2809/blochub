# Direct Changes Ledger — blochub — 2026-06

> NO-TOUCH CRITIC project. Every Direct-mode change logged per Master CLAUDE.md §2d.

---

## 2026-06-01 — DPO email → dpo@4pro.io (single ecosystem-wide address)

**Mode**: Direct, user-directed ("toate proiectele folosesc dpo@4pro.io și nu mai sunt altele, ex. dpo@blocx.ro"). NO-TOUCH CRITIC, propose-confirm-apply (user authorized the full 5-step cross-project plan).

**Why**: Ecosystem decision — one DPO mailbox `dpo@4pro.io` for every app (functional, forwards to alex.danciulescu@knowhow.best). Supersedes the prior per-domain `dpo@blocx.ro` design (2026-05-27 Legal integration).

**Change** (3 files, string-only):
- `src/app/api/consent/document/route.ts:16` — `APP_DPO_EMAIL` const `dpo@blocx.ro` → `dpo@4pro.io` (this is the value blochub substitutes for `{entity_dpo_email}`/`{app_dpo_email}` tokens when rendering Legal-hub docs locally) + comment updated.
- `src/app/gdpr/page.tsx` — 2 mailto links `dpo@blocx.ro` → `dpo@4pro.io`.
- `src/app/privacy/page.tsx` — 3 mailto links `dpo@blocx.ro` → `dpo@4pro.io`.
- **NOT touched**: `support@blocx.ro` (support contact, not DPO — out of scope).

**Verify**: `grep -rn dpo@blocx src/` → 0. tsc: my 3 files clean (only pre-existing jest-dom test-file type errors remain, unrelated). String-only change, no logic touched.

**Governance**: no DB/consent/payment touched; display + token-substitution string only. Needs a routine deploy to surface on blocx.ro (`/var/www/deploy.sh blochub`).

**Cross-ref**: Legal `Reports/DIRECT-CHANGES-2026-06.md` (entity column + procu DPA v1.1 same directive); memory `project_single_dpo_address`.

---

## 2026-06-02 — New-user UX test (journey/TGW) + user manual — NO code change (audit + docs only)

**Mode**: Direct, user-directed (handoff 2026-06-02 tasks 1+2). NO-TOUCH CRITIC. **Zero code/payment touched** — read-only audit + documentation. Decisions confirmed at start: admin-complete + proprietar-from-invite coverage, fixture+cleanup on PROD, TGW included.

**What I did**:
- Real-browser walk (Chromium/Playwright) of the full NEW-USER flow on **production blocx.ro**, both roles, with screenshots + code/network/DB ground-truth.
- Provisioned a labeled test admin (`journey-newuser@blochub.app`) via real signup + onboarding; created fixture (asociație + clădire + scară + 2 apartamente + 1 chitanță) via authenticated API; created a test proprietar (`journey-proprietar@blochub.app`) + apartment link (DB, since invite-accept is broken) to walk the portal with a real bill.
- journey-audit on the admin: **14 OK / 3 GATED** (= baseline, no regression).
- Restarted Tester-Gateway :5050 with current token (placeholder token, but verified 200-with-token/403-without); critical-flows run blocked by config schema errors + missing `BLOCHUB_TEST_EMAIL` in TGW `.env` (logged as G-BLOC-TGW-001).

**PROD writes + cleanup (authorized fixture)**: all test rows created were deleted at end via scoped FK-safe SQL (`/tmp/blochub-cleanup.sql`, run via `psql -f`). **Verified post-cleanup**: 0 test users / 0 test asociație / 0 test apartments / 0 test invitations remain; real data intact (1 asociație, 2 users, 1 apt, 1 chitanță pre-existing); blocx.ro + /api/health = 200/200.

**Deliverables**:
- `knowledge/MANUAL.md` — user manual (RO, step-by-step, both roles) + auto-explicability verdict.
- `Reports/newuser-journey-2026-06-02/REPORT.md` — honest gap report with severity + evidence + screenshots.
- `AUDIT_GAPS.md` — 12 new gaps logged **OPEN** (G-BLOC-015..026), all AUDIT-ONLY (no fix applied).

**Headline findings** (all OPEN, propose-confirm-apply later):
- **G-BLOC-015 [P1]**: proprietar invite-accept BROKEN — `middleware.ts:51` auth-gates the public `/api/invitations/accept` → "Invitație Invalidă" for logged-out invitees. Proprietar onboarding non-functional in prod.
- **G-BLOC-016 [P2]**: guided 4-step `SetupWizard` orphaned (zero usages) → new admin gets bare empty-state.
- **G-BLOC-020 [P3]**: auto-explicability — proprietar sees total but not the line-item "why" (`detaliiJson` not exposed).

**Verify ritual**: re-ran blocx.ro health (200/200) post-cleanup; journey-audit baseline preserved (14 OK/3 GATED). No deploy (no code change).

**Cross-ref**: handoff 2026-06-02; `Reports/newuser-journey-2026-06-02/REPORT.md`.
