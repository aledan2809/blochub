# AI Skills GAP Analysis — BlocHub
**Data**: 2026-04-10
**Proiect**: BlocHub (Enterprise HOA/Property Management)
**Stack**: Next.js 16, React 19, Tailwind 3, Prisma 5, Supabase PostgreSQL, Stripe+Revolut
**Deploy**: Vercel + Vercel Cron
**AI**: OpenAI GPT-4 (doar OCR), ai-router STUB

---

## 1. AI Skills Existente

| Skill | Status | Detalii |
|-------|--------|---------|
| OpenAI GPT-4 | DA — ACTIV | `src/agents/ocr-factura.ts` + `ocr-index.ts` |
| 6 AI agents framework | DA — ACTIV | BaseAgent factory pattern, `src/agents/` |
| AI Router | STUB | `ai-router.ts` — TODO comment, nefuncțional |
| CLAUDE.md | GENERIC | Template gol |
| Jest + Playwright | CONFIGURAT | Zero teste scrise |

**Total AI skills existente: 3/10**

---

## 2. AI Skills Necesare

| # | Skill AI | Prioritate | Complexitate | Impact |
|---|----------|-----------|--------------|--------|
| 1 | Activare ai-router (replace stub) | **CRITICĂ** | Mică | Multi-provider, cost savings |
| 2 | Invoice analysis AI | **ÎNALTĂ** | Medie | Anomaly detection pe facturi |
| 3 | Resident communication AI | MEDIE | Medie | Auto-reply, FAQ bot |
| 4 | Budget prediction | MEDIE | Mare | Forecast cheltuieli |
| 5 | Document classification | OPȚIONAL | Mică | Auto-categorize documente HOA |

---

## 3. Scor AI Readiness

| Criteriu | Scor | Max |
|----------|------|-----|
| CLAUDE.md | 0.5 | 2 |
| AI Router integrat | 0 | 2 |
| AI features implementate | 1 | 3 |
| Teste | 0 | 2 |
| Documentație AI | 0 | 1 |
| **TOTAL** | **1.5/10** | 10 |

**Verdict**: 6 agenți AI definiți dar ai-router e STUB. Doar OpenAI GPT-4 pentru OCR. Zero teste scrise deși Jest+Playwright sunt configurate. Gap critic: ai-router nefuncțional.
