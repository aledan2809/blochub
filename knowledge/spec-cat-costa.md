# Spec tehnic — `/cat-costa` (Educatorul public de întreținere)
Created: 2026-05-31 · Status: BUILD-READY · Companion: `STRATEGY.md` §3, `knowledge/viral-loop-spec.md` Feature 1

> Pagina publică, fără login, care explică proprietarului pe ce se duc banii din întreținere, ce e normal și unde
> plătește prea mult — apoi îl convertește (Cere BlocX / Roata). E asset-ul de conținut viral + SEO al BlocX.
> Stateless (zero PII, zero DB write în v1). Refolosește AIRouter + OCR + rate-limit existente.

---

## 1. Goal / Non-goals
**Goal:** input simplu (sume de pe avizier) → defalcare clară + explicație umană per rând + semnale roșii + benchmark orientativ + share + CTA.
**Non-goals (v1):** fără cont, fără salvare date, fără legătură cu o asociație reală, fără sfat juridic obligatoriu, fără „media orașului" cu date reale (vezi §6 benchmark honesty).

## 2. Stack & încadrare
- Next.js 16 App Router, RSC + un client component pt formular/animații.
- AI: `src/lib/ai-router.ts` (RO, text) — refolosit, pattern din `src/agents/chatbot.ts`.
- OCR (v1.1): `src/agents/ocr-factura.ts` / `ocr-index.ts` adaptate pt avizier.
- Rate-limit: `src/lib/rate-limit.ts` (`checkRateLimit`, `getClientIdentifier`).
- OG image: `next/og` (ImageResponse).
- Public-page pattern existent: `/privacy`, `/pricing`, `/roata`.

## 3. Rute & fișiere (de creat)
```
src/app/cat-costa/page.tsx               # RSC: hero SEO + <CatCostaCalculator/> + FAQ + CTA
src/app/cat-costa/CatCostaCalculator.tsx # 'use client': formular + render rezultat + share
src/app/cat-costa/opengraph-image.tsx    # OG default al paginii
src/app/api/cat-costa/explica/route.ts   # POST: rule-engine + AIRouter, stateless
src/app/api/cat-costa/share-image/route.ts # GET: OG image dinamic din rezultat (query-encoded)
src/lib/cat-costa/rules.ts               # rule-table curată (sursa de adevăr structurală)
src/lib/cat-costa/types.ts               # tipuri request/response
```

## 4. Arhitectura explainer-ului — DOUĂ STRATURI (coloana anti-halucinație)
**Regula de aur:** LLM-ul NU inventează niciodată afirmații normative/legale/procente „normale". Acelea vin din `rules.ts` (curat de om). AIRouter face DOAR formularea umană + citirea personalizată, primind faptele structurale în prompt.

**Strat 1 — Rule engine (`src/lib/cat-costa/rules.ts`), determinist:**
Pentru fiecare `TipCheltuiala` (cele 13 din enum: APA_RECE, APA_CALDA, CANALIZARE, GAZ, CURENT_COMUN, CALDURA, ASCENSOR, CURATENIE, GUNOI, FOND_RULMENT, FOND_REPARATII, ADMINISTRARE, ALTE_CHELTUIELI):
```ts
interface CheltuialaRule {
  tip: TipCheltuiala
  denumire: string                 // refolosește getDenumireCheltuiala existent
  repartizareNormala: 'CONSUM'|'PERSOANE'|'COTA_INDIVIZA'|'APARTAMENT'  // cum se face corect, legal
  explicatieScurta: string         // "Se plătește pe consum dacă ai contor; altfel pe persoane"
  ponderTipicPct?: [number, number] // interval orientativ din total (ex. FOND_REPARATII [5,25])
  redFlags: { conditie: (ctx)=>boolean, nivel:'info'|'atentie'|'rosu', mesaj:string }[]
}
```
Red-flags = reguli explicite, ex.: `FOND_REPARATII > 30% din total fără proiect` → roșu „Cere la adunarea generală pe ce se cheltuie"; `ADMINISTRARE > X lei/apartament` → atenție; `APA pe PERSOANE când blocul are contoare` → atenție „ai putea plăti pe consum".

**Strat 2 — AIRouter (formulare):**
Primește defalcarea + faptele din rule engine; întoarce text uman per rând + rezumat + 2-3 sfaturi. Forced structured output (pattern forced-tool din ecosistem). Prompt system: „Ești un explicator neutru de costuri de bloc în România. Folosește DOAR faptele furnizate; NU inventa cifre, legi sau procente. Ton: clar, empatic, fără jargon." Limbă: RO. Fără PII în prompt.

## 5. API contract — `POST /api/cat-costa/explica`
**Request:**
```jsonc
{
  "apartament": { "camere": 2, "persoane": 3, "suprafata": 55, "areContoare": true },
  "cheltuieli": [ { "tip": "APA_RECE", "suma": 85 }, { "tip": "FOND_REPARATII", "suma": 120 }, ... ],
  "oras": "Cluj-Napoca"   // optional, pt benchmark
}
```
**Response:**
```jsonc
{
  "total": 412.50,
  "defalcare": [
    { "tip":"FOND_REPARATII","denumire":"Fond de reparații","suma":120,"procent":29.1,
      "repartizareNormala":"COTA_INDIVIZA","explicatie":"...",
      "semnal": { "nivel":"rosu","mesaj":"29% din total pe fond de reparații — cere la adunare pe ce se cheltuie." } },
    ...
  ],
  "benchmark": { "label":"Estimativ pt 2 camere", "interval":[300,450], "sursa":"referință orientativă", "estimativ": true },
  "rezumat": "Întreținerea ta de 412 lei e în intervalul normal, dar fondul de reparații e mare...",
  "sfaturi": ["Cere defalcarea fondului de reparații", "Verifică dacă apa se poate plăti pe contor"]
}
```
**Comportament:** validează input (zod), rulează rule engine → construiește faptele → 1 apel AIRouter pentru formulare → merge. Rate-limit IP (`checkRateLimit`, config dedicat ex. 20/min). **Zero persistență.** Soft-fail: dacă AIRouter pică, întoarce defalcarea + explicațiile din rule engine (fără text personalizat) — pagina rămâne utilă.

## 6. Benchmark — onestitate (critic)
La lansare ai ~0 date reale → **NU afișa „media orașului" ca și cum ai avea-o.** v1: intervale orientative curate în `rules.ts` (pe nr. camere), etichetate explicit „estimativ/orientativ". Când ai volum real → înlocuiești cu agregat real (anonimizat, din `Chitanta`), eticheta devine „media reală pe N blocuri din {oraș}". Niciodată cifre inventate prezentate ca fapt.

## 7. UI rezultat (`CatCostaCalculator.tsx`)
- Input: mod manual (rânduri tip+sumă; tipurile din enum + „altă cheltuială") + opțional camere/persoane/contoare/oraș. (v1.1: „urcă poza avizierului" → OCR.)
- Output: donut/bars animate per categorie · per rând: denumire + sumă + % + badge repartizare + explicație + semnal (info/atenție/roșu) · card rezumat · card benchmark (etichetat estimativ) · listă sfaturi.
- **Share:** buton „Distribuie defalcarea" → imagine OG (`/api/cat-costa/share-image?...`) cu defalcarea + „explicat de BlocX.ro" → Web Share API / copy link. Ăsta e artefactul care intră în grupul blocului.
- **CTA dublu (jos + sticky):** (a) „Vrei transparența asta REALĂ, lunar, pe blocul tău? → **Cere BlocX**" (`/cere-blocx`, Feature 2). (b) „Ești administrator? Încearcă gratuit până la 12 luni → **Roata**" (`/roata`).

## 8. SEO (pagina = motorul de achiziție organică)
- SSR, metadata țintă: „de ce e întreținerea așa mare", „cum se calculează întreținerea bloc", „fond de reparații cât e normal".
- Structured data: `FAQPage` (întrebări frecvente despre întreținere) + `HowTo` (cum citești avizierul). Open Graph + Twitter card.
- Conținut evergreen sub calculator (explică fiecare `TipCheltuiala` în limbaj uman) — din `rules.ts`, dublă folosință: SEO + transparență.
- Link intern din landing + footer.

## 9. Analytics / metrici (feed pt North Star)
- Eventuri (GA4 existent): `catcosta_calc` (a calculat), `catcosta_share`, `catcosta_cta_cere` (a), `catcosta_cta_roata` (b).
- Funnel: vizite → calcule → share-uri → click „Cere BlocX" → (Feature 2) signup admin atribuit.

## 10. Anti-abuse & cost
- Rate-limit IP pe `/api/cat-costa/explica` (20/min) + pe OCR (v1.1).
- Cost AI: 1 apel scurt/calcul; AIRouter free-cascade (groq/gemini) → ~$0. Soft-fail fără AI.
- Fără DB, fără PII → fără suprafață GDPR în v1.

## 11. Edge cases & caveat-uri oneste
- AI poate „înflori" → mitigare: faptele vin din rule engine; testează că `explicatie` nu introduce cifre noi (post-check: nicio cifră în text care nu e în input/rules).
- OCR avizier (v1.1) e nesigur pe layout-uri variate → manual-first; OCR ca asistență, cu confirmare user.
- Benchmark fără date → etichetat estimativ (vezi §6).
- Semnal roșu = educativ, NU acuzație → formulări „cere lămuriri", nu „administratorul fură".

## 12. Faze
- **v1 (MVP, ~1 săpt):** manual input + rule engine + AIRouter formulare + UI + share OG + CTA + SEO. Stateless.
- **v1.1:** OCR avizier (poză → prefill) · benchmark real din agregat anonim · A/B pe CTA.

## 13. Acceptance criteria
1. `/cat-costa` randează SSR, fără login, Lighthouse SEO ≥95.
2. Calcul cu 5 cheltuieli → defalcare corectă (% sumează 100), explicații per rând, ≥1 semnal când se aplică o regulă.
3. AIRouter down → pagina încă afișează defalcare + explicații rule-engine (soft-fail).
4. Niciun text AI nu conține cifre/procente absente din input+rules (post-check).
5. Benchmark afișat e etichetat „estimativ" cât timp nu există agregat real.
6. Share generează OG image lizibil cu „BlocX.ro".
7. Ambele CTA-uri (Cere BlocX + Roata) prezente + tracked.
8. Rate-limit activ; zero DB write; zero PII persistat.

## 14. Cross-refs
- Enum + denumiri: `prisma/schema.prisma` `TipCheltuiala`, `getDenumireCheltuiala` (în `src/agents/calcul-chitanta.ts`).
- AIRouter: `src/lib/ai-router.ts`, pattern `src/agents/chatbot.ts`.
- OCR (v1.1): `src/agents/ocr-factura.ts`, `ocr-index.ts`.
- CTA next: `/cere-blocx` (viral-loop-spec Feature 2), `/roata` (`src/lib/roata.ts`).
- Repartizare corectă (precondiție pe cifre): G-BLOC-006 ✅, G-BLOC-009 ⏳ (AUDIT_GAPS).
