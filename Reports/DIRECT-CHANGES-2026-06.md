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
