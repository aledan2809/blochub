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

_No gaps identified yet. This ledger was scaffolded on 2026-04-24 to comply with Master `CLAUDE.md` §2d. Populate via the next E2E Audit run (`Optimise run` / ML2 wave)._

| Gap ID | Severity | Area | Description | Status | Resolution |
|--------|----------|------|-------------|--------|------------|
| — | — | — | — | — | — |

---

## Reports index

- `Reports/AUDIT-<date>.md` — individual audit reports
- `Reports/DIRECT-CHANGES-YYYY-MM.md` — monthly Direct-session change log
