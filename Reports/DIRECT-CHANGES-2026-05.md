# BlocHub — Direct Changes Ledger — 2026-05

> NO-TOUCH CRITIC (payment flows). Per CLASSIFICATION §2d, every Direct modification is logged here.

## 2026-05-25 — DBM cleanup: DIRECT_URL Neon → local PG (vestigial)

**Context**: re-verification of DBM follow-up (user request). blochub was migrated to VPS2 self-hosted PG on 2026-05-11 (DBM T2#1) — `DATABASE_URL` already on `127.0.0.1:5432/blochub`. Found that `DIRECT_URL` in `/var/www/blochub/.env` still pointed to the **dead/auto-paused Neon** endpoint (`ep-lingering-art-agtxuo69.c-2.eu-central-1.aws.neon.tech`), AND `prisma/schema.prisma` uses `directUrl = env("DIRECT_URL")`.

**Risk addressed**: latent migration bug — any future `prisma migrate deploy` / `prisma db push` would have tried to connect to the dead Neon via DIRECT_URL and failed. Runtime was unaffected (the app uses the generated client + `DATABASE_URL`).

**Change** (VPS2 `/var/www/blochub/.env`, backup `.env.bak-2026-05-25-pre-dbm-cleanup`):
- Commented the old Neon `DIRECT_URL` line (preserved inline with `[DBM-cleanup 2026-05-25]` marker for rollback).
- Appended `DIRECT_URL` mirroring `DATABASE_URL` (local PG `127.0.0.1:5432/blochub?sslmode=disable` — no pooler on self-hosted PG, so directUrl == url is correct).

**Verification**:
- `npx prisma validate` → "The schema at prisma/schema.prisma is valid 🚀" (DIRECT_URL resolves).
- `https://blocx.ro/` → 200, `https://blocx.ro/api/health` → 200.
- **No restart** performed and none needed — `DIRECT_URL` is read only by the Prisma CLI at migrate-time, not by the running process. Zero runtime / payment-flow impact.

**Scope**: single `.env` line (DIRECT_URL). No code, no schema, no payment-flow files touched.

---

## 2026-05-27 — Admin account email + password change (user's own account)

**Trigger**: User (Alex) couldn't log in — was using `alexdanciulescu@gmail.com`, but the only admin account in prod DB was `alex.danciulescu@knowhow.best`. User requested email change to the Gmail address + new password.

**Change** (prod DB `blochub` on VPS2, via Prisma `user.update` by id `cmmwbvs9f0000yqehdm3v5sc0`):
- `email`: `alex.danciulescu@knowhow.best` → `alexdanciulescu@gmail.com`
- `password`: re-hashed with bcryptjs cost 12 (same as app `hashPassword`)
- `role`: ADMIN (unchanged)

**Rollback anchor** (old values):
- old email: `alex.danciulescu@knowhow.best`
- old password hash: `$2b$12$8QlpwAfXnrkf/VejhY1g3uQwhwRDmXGkk5GHKblFXvYhgW85nF7fa`

**Verification**:
- Prisma re-read: email = `alexdanciulescu@gmail.com`, role ADMIN, `bcrypt.compare(newPw, hash)` = true, total users still 2 (no duplicate).
- End-to-end login on `https://blocx.ro` via NextAuth credentials → HTTP 200 + `/api/auth/session` returns the user (email + ADMIN role).

**Scope**: single user row (data only). No code, no schema, no payment-flow files. NO-TOUCH payment paths untouched.

**Note for follow-up (not done)**: login `authorize()` does a case-sensitive `findUnique` with no email normalize + returns a generic "Email sau parolă incorectă" for both non-existent-email and wrong-password. Optional UX hardening (lowercase+trim on login & register) tracked only if user requests.

---

## 2026-05-27 — Legal entity correction: TechBiz Hub → Class RDA Impex SRL + dpo@blocx.ro

**Trigger**: User noticed the Privacy page showed `TechBiz Hub L.L.C-FZ` (Dubai entity) + `@4pro.io` emails on a Romanian HOA app. Requested: controller = Class RDA Impex SRL (coordinated via Legal hub), GDPR contact = `dpo@blocx.ro`.

**Investigation findings**:
- 3 legal surfaces were misaligned: static pages (`/privacy`,`/terms`,`/gdpr`) hardcoded TechBiz Hub + @4pro.io; consent modal hit a non-existent Legal endpoint (`/api/v1/documents/latest` → 404); Legal had NO `AppEntityMapping` for `appSlug=blochub` (entity resolved to null). Consent status route also used a wrong URL (404).
- Class RDA Impex SRL exists in Legal (slug `class-rda`, CUI 29867320), shared controller across multiple apps.

**Changes — Legal hub (NO-TOUCH CRITIC, 1 DB write)**:
- Created `AppEntityMapping` (id `cmpnpwxu80001t664pc3yt43u`): `appSlug=blochub`, controller+biller = Class RDA Impex SRL (`cmosbs0gm0000t6nvx3t9fl24`), `platformRole=CONTROLLER`, `effectiveUntil=null`. Rollback: set `effectiveUntil=now()`. No doc fork — master legal text stays single-source (zero drift).

**Changes — blochub (legal pages + Legal proxies; NO payment-flow files touched)**:
- `src/app/api/consent/document/route.ts`: URL `/api/v1/documents/latest?...` → `/api/v1/public/legal/blochub/{type}`; adapted to new response shape; substitutes entity tokens ({entity_name}/{entity_cui}/{entity_address}/{entity_jurisdiction}) from Legal entity (Class RDA) + `{entity_dpo_email}` → `dpo@blocx.ro` (app-specific override).
- `src/app/api/consent/status/route.ts`: URL `/api/v1/consent/status/{app}/{id}` → `/api/v1/public/consent-status?appSlug=blochub&globalUserId={id}`.
- `src/app/privacy/page.tsx`, `terms/page.tsx`, `gdpr/page.tsx`: `TechBiz Hub L.L.C-FZ` → `Class RDA Impex SRL` (+ CUI 29867320 + sediu pe privacy); `gdpr@4pro.io` → `dpo@blocx.ro`; `support@4pro.io` → `support@blocx.ro`.

**Decision noted**: `support@4pro.io` → `support@blocx.ro` (user's principle: emails must match the domain; user said "aplică" without objecting). `dpo@blocx.ro` / `support@blocx.ro` mailboxes are the user's responsibility to provision.

**Scope**: 5 source files + 1 Legal mapping row. No code/schema in payment flows. NO-TOUCH payment paths untouched.

---

## 2026-05-28 — Regulament page: filled CUI / J / sediu from Legal

**Trigger**: User noticed the `/regulament` page (lottery rules for the "Roata administratorilor" campaign) had unfilled placeholders `[CUI — de completat]`, `[J.. / .. / .. — de completat]`, `[sediul social — de completat]`. Directive: source values from Legal hub.

**Change** (`src/app/regulament/page.tsx`, ORG constant, 4 lines):
- `cui`: `[CUI — de completat]` → `29867320` (from Legal `LegalEntity.cui` for `class-rda`)
- `reg`: `[J.. / .. / .. — de completat]` → `J40/2439/2012` (from Legal `LegalEntity.registrationNumber`, set 2026-05-28 — new column)
- `sediu`: `[sediul social — de completat]` → `Str. Pridvorului nr. 5, bl. 6, ap. 1, Sector 4, București, România` (from Legal `LegalEntity.address` JSON)
- Updated comment to point at Legal as source of truth (vs old "TBD before relying legally").

**Pair commit on Legal**: `441d90e` — added nullable `registrationNumber` column to `LegalEntity` schema (Legal commit) + UPDATE `class-rda` SET `registrationNumber='J40/2439/2012'`. See `Legal/Reports/DIRECT-CHANGES-2026-05.md` 2026-05-28 entry.

**Scope**: 1 source file (ORG constant only, no JSX), 4 values. No payment-flow files. Values hardcoded for now (runtime fetch from Legal `/api/v1/public/active-entity` is a future improvement if user wants true runtime single-source).
