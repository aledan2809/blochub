# Lessons Learned — blochub

**Central source**: `Master/knowledge/lessons-learned.md` carries cross-
project lessons (L01-L52+). Entries here are project-specific where the
incident is unique to blochub, or where a Master lesson was
re-instantiated against this codebase and the local detail is worth
preserving.

## Format

Each entry includes:
- **Project**: blochub
- **Date**: ISO date
- **Category**: Performance / Security / Architecture / DevOps / Database / Frontend / Backend / Integration / Payments
- **Lesson**: What we learned
- **Action**: What to do differently
- **Cross-ref**: Master L# if applicable

---

## Lessons

### L01 — `package.json start` script hardcoded port broke nginx → PM2 → 502 (Master L34)

- **Project**: blochub
- **Date**: 2026-04-17
- **Category**: Deploy / PM2
- **Lesson**: `npm start` script was `"next start -p 3004"` (hardcoded port). Nginx proxies blocx.ro → 3011. Setting `PORT=3011` in `.env.local` had ZERO effect because the script overrode it via `-p 3004`. After PM2 restart, app listened on 3004 → nginx 502 → app effectively offline despite "PM2 online" status. Took deliberate restart with `PORT=3011 pm2 start npm -- start` to bind correctly.
- **Action**: Change all `next start -p XXXX` to `next start -p ${PORT:-XXXX}` so env var wins. Pattern: any service behind nginx must have port-overridable start script. After fix, PM2 uses env var seamlessly (`pm2 start npm --name X --env-vars PORT=YYYY`).
- **Cross-ref**: Master L34.

### L02 — Payment flows are NO-TOUCH CRITIC (CLASSIFICATION §4)

- **Project**: blochub
- **Date**: 2026-04-16
- **Category**: Payments / Governance
- **Lesson**: `src/app/api/payments/*` routes (Revolut integration) are classified NO-TOUCH CRITIC per Master CLASSIFICATION.md. Pipeline AIP2/ABIP2 are restricted to audit-only on these paths; Direct mode requires propose-confirm-apply per edit + AUDIT_GAPS ledger entry per change.
- **Action**: Before any work on `src/app/api/payments/`, surface the propose-confirm-apply protocol, link the change to a G-XXX entry in this project's AUDIT_GAPS.md (create if absent), commit with `fix/feat(payments): G-XXX <desc>` format, then update the ledger Status: OPEN → Eliminated post-deploy verification.
- **Cross-ref**: Master CLASSIFICATION.md §4 (NO-TOUCH CRITIC for blochub payment flows) + Master CLAUDE.md §2d (NO-TOUCH protocol).

---

## Update Log

| Date | Change |
|------|--------|
| 2026-04-25 | Initial stub created — captures L01 (port hardcode) from Master L34 + L02 (payment flows NO-TOUCH discipline). Future incidents should be appended here with cross-ref to Master when the lesson generalizes. |
