# TODO Persistent — BlocHub

> Read at start of EVERY session on this project. Items stay until marked `[x]` with date + commit.

**Project safety**: NO-TOUCH CRITIC for payment flows (`src/app/api/payments/*`) — rest is ACTIVE. | **Production**: blocx.ro (VPS2, port 3011)

---

## [x] 🎡 Roata norocului — tombolă early-adopter (creat + DONE 2026-05-27 commit `fa6d230`)

**DONE 2026-05-27** (Direct): LIVE pe `blocx.ro/roata`. Roată-ceas **1-12 luni gratis**, rezultat **decis pe server** (`/api/roata/spin` — anti-cheat; animația aterizează acolo). **5 spins/zi** + cooldown **1 min** (termometru), păstrezi cel mai bun rezultat al zilei (max 12), retry a doua zi. **Plafon 20 conturi cu 12 luni** (`/api/roata/claim` respinge 12 când e sold-out; 12 exclus din spin). **Campanie 7 zile** + countdown d/h/m/s. Claim = `EarlyAdopterRegistration` (`source=roata`, `freeMonths`; 1 claim/email → 409 pe duplicat). Env-tunable: `BLOCHUB_ROATA_START` (setat = acum pe VPS2, ends 2026-06-03), `_DAYS=7`, `_MAX12=20`. **NU s-a atins payments.** Verificat end-to-end (spin 12/10/7, claim 7, dup→409, cleanup). CTA pe `/oferta` → `/roata`.
- **Follow-up opțional:** repointarea reclamelor FB BlocHub `/oferta` → `/roata` (roata = experiența mai bună pentru „vezi câte luni gratis primești"). Necesită delete+recreate pe FB. De decis cu user.

## [x] 🎯 Early-adopter offer page (creat 2026-05-26, DONE 2026-05-27 commits `ed1b0bc`+`023901d`+`5cae072`)

**DONE 2026-05-27** (Direct): LIVE pe `blocx.ro/oferta`. Pagină publică BlocX (RO) cu tier curent (12 luni la start) + **contor locuri rămase** (scarcity, NU programul de scădere — per brief) + formular înscriere (nume/asociație/email/telefon/oraș). Model nou `EarlyAdopterRegistration` (lead, NU plată; `db push` pe PG local VPS2 ✓). `/api/oferta` GET status + POST lead cu **tier calculat server-side** (`src/lib/offer.ts`: 12→6 luni, -1/săptămână, start `BLOCHUB_OFFER_START` default 2026-06-22, `BLOCHUB_OFFER_SPOTS_PER_TIER` default 10 — toate env-tunable). Contor = înscrieri per `tierMonths` (scade corect, verificat end-to-end: 10→POST→9→cleanup→10). **NU s-a atins `src/app/api/payments/*`.** Verificat: HTTP 200 pagină + API, validare zod, lead salvat + contor scade, PM2 healthy.
- ⚠️ **Build-blocker pre-existent reparat** (`ed1b0bc`): regexul `/^[-:\s]+$/` din `BlocConsentModal.tsx` (adăugat 2026-05-17, commit `93f5bcf`) era mis-extras de Tailwind ca clasă arbitrară → CSS invalid → Turbopack pica → **proiectul nu mai buildase din 2026-04-29**. Fix: `blocklist: ['[-:\\s]']` în tailwind.config (config-only, fără atingere logică). Acest deploy a adus live și consent gate-ul (commit 05-17 nedeployat până acum).

**Origin:** maxi-campania de recrutare administratori (tracked în `MarketingAutomation/TODO_PERSISTENT.md` "BlocHub maxi campanie early-adopter"). Pagina e destinația ("aterizarea") ofertei.

**Cerință (user 2026-05-26):** pagină publică pe blocx.ro unde primii administratori își revendică luni gratis.
- **Oferta:** intern 12→6 luni gratis, **-1 lună/săptămână, locuri limitate**. **Public: DOAR oferta curentă + urgență** ("nu se știe câte luni vor mai fi gratis săptămâna viitoare — grăbește-te"); NU afișa programul de scădere.
- **Conținut pagină:** tier curent (X luni) + **contor locuri rămase** + **formular înscriere administrator** (nume, asociație/bloc, email, telefon, oraș).
- **Logică:** tier-by-week (calculează luna curentă din săptămâna de start) + count înscrieri per tier (locuri limitate).

**Governance:** ⚠️ NU atinge `src/app/api/payments/*` (NO-TOUCH CRITIC). Pagina de ofertă = înscriere/lead (model nou `EarlyAdopterRegistration` sau similar), NU plăți. Build izolat (fișiere noi). Prisma 5 migrare pe DB-ul VPS2 (self-hosted PG, DBM-migrated) — cu grijă.
- Public page (ex. `/oferta`), API route înscriere, model lead, contor.
- Verifică: pagina publică se încarcă, formularul salvează lead, contorul scade.

**Status:** spec gata (sesiune dedicată pt build, ca să nu se facă pe finalul unei sesiuni lungi).

---

## [x] 📖 Manual de utilizare + verdict „produsul se auto-explică?" — DONE 2026-06-02 (`knowledge/MANUAL.md` + `Reports/newuser-journey-2026-06-02/REPORT.md`; commit d2b458c, deployed)

**Cerință user:** „Presupune că ești nou intrat pe site-ul aplicației și vrei să știi ce face și cum o folosești. Ai aici tot ce-ți trebuie? Fă un sumar cu ce face + ce butoane trebuie apăsate ca să ajungi aici — un manual."

**De livrat:**
1. **Manual de utilizare** (RO) — pas cu pas, din perspectiva unui user complet nou: ce face BlocX + traseul de butoane/click-uri pentru fiecare capabilitate majoră (signup → onboarding asociație → clădire/scări/apartamente → proprietari → cheltuieli → repartizare → chitanțe → încasări/plăți → tichete → portal proprietar). Pentru fiecare: „ca să ajungi aici, apeși X → Y → Z".
2. **Verdict onest de auto-explicabilitate:** „un user nou are TOT ce-i trebuie ca să se descurce singur?" — unde se blochează, unde lipsesc indicii (tooltips, empty-state guidance, wizard, help), unde trebuie să ghicească. Acoperă AMBELE roluri (vezi decizia #1 mai jos).
3. Output: `knowledge/MANUAL.md` (manualul) + secțiune „Gaps de onboarding/UX" în raport.

## [x] 🧪 Test UI real / journey / TGW + FIX ALL 12 gaps — DONE 2026-06-02 (commit d2b458c deployed+verified)

**Rezultat (2026-06-02):** Decizii: Direct · admin+proprietar · PROD cu fixture+cleanup · TGW inclus. Test real ambele roluri pe blocx.ro. **12 gap-uri noi OPEN (G-BLOC-015..026)** + G-BLOC-TGW-001. Headline: **G-BLOC-015 [P1]** invite-accept rupt (middleware auth-gate pe `/api/invitations/accept`) → proprietarii nu pot intra; **G-BLOC-016 [P2]** wizard onboarding orfan; **G-BLOC-020 [P3]** auto-explicabilitate (proprietarul nu vede *de ce* plătește). journey-audit 14 OK/3 GATED (baseline). TGW repornit cu token curent dar critical-flows blocat (schema errors + lipsă `BLOCHUB_TEST_EMAIL`). Fixture PROD curățat complet (verificat 0 test rows; real data intact; blocx.ro 200/200). Raport: `Reports/newuser-journey-2026-06-02/REPORT.md`. Ledger: `Reports/DIRECT-CHANGES-2026-06.md`.

---

## [archived-context] 🧪 Test UI real — decizii originale (creat 2026-06-01)

**Cerință user:** „Testează cu UI real / journey / TGW și vom vedea cât de ușor e pentru un user nou. Fă testarea cum trebuie, responsabil și fără să omiți nimic, raportează onest unde sunt problemele/gap-urile. Voi verifica și eu live și comparăm rezultatele."

**De făcut (complet, fără a omite):**
- Journey audit (`npx @aledan007/tester journey-audit`) + TGW (`Tester-Gateway/apps/blochub.json` — config creată 2026-05-31) + UI real headed pe traseul de prim-contact.
- Focus: **uşurinţa pentru user nou**, nu doar „pagina se încarcă 200". Măsoară fricțiunea: câți pași până la prima valoare, unde se gripează, ce e neclar.
- Raport onest cu gap-uri (severitate), comparabil cu verificarea live a user-ului.

**⚠️ 3 DECIZII DE LUAT LA STARTUL NOII SESIUNI (nelămuriri semnalate 2026-06-01):**
1. **Cine e „user-ul nou"?** Admin (cumpărătorul — signup + onboarding = traseul make-or-break) vs proprietar (portal). *Default propus:* AMBELE, admin-primar. Manual + test acoperă întâi traseul admin (signup→onboarding), apoi portalul proprietar.
2. **Cont nou + onboarding complet pe PROD?** Ca să testezi traseul REAL de user nou trebuie **înregistrat un cont proaspăt + parcurs onboarding-ul** (creează asociație/clădire/apartamente = scrieri în PROD local PG, blochub NO-TOUCH CRITIC). *Default propus:* da, cu un **cont test clar etichetat** (ex. `journey-newuser@blochub.app`) + fixture minimal + **cleanup la final** (ledger în DIRECT-CHANGES). Alternativă (mai slabă): doar public + contul existent care se gripează la onboarding-wall. **Cere confirm user.**
3. **Precondiții TGW:** gateway-ul rulează cu token nepotrivit față de `.env` (run-ul a fost blocat 2026-05-31) → **restart TG cu tokenul curent** sau resolve token. Scoring-ul Vision poate fi credit-blocked (Anthropic) → folosește calea **Claude-CLI-subprocess** din `mesh/qa/ui-tester.js` (L118 closed) ca să meargă fără credit API.

---

## [ ] 🔧 Gap-uri audit deferate (din True E2E 2026-05-31 — vezi AUDIT_GAPS.md)

Ordine recomandată: G-BLOC-009 (deblochează transparența publică) → G-BLOC-005-rest+010 (sesiune txn+webhook) → G-BLOC-007-rest → G-BLOC-011 (UI) → G-BLOC-013 (cross-NO-TOUCH cu Legal) → 012-rest/014.
- [ ] **G-BLOC-009** (P2) — repartizare `Float`→`Decimal` + alocare rest la rotunjire (necesită teste; **precondiție pt cifrele publice din `/cat-costa`**)
- [ ] **G-BLOC-005-rest** (P1) — `$transaction` wrap pe `chitante/generate` + race numar chitanță
- [ ] **G-BLOC-010** (P2) — atomicitate recompute webhook Stripe/Revolut (bundle cu 005)
- [ ] **G-BLOC-007-rest** (P1) — audit-log pe schimbări rol/user (`admin/users`) + settings (`admin/settings`) + asociație create
- [ ] **G-BLOC-011** (P2) — contrast a11y (5×/) + touch targets <44px pe landing (pas UI + verificare vizuală)
- [ ] **G-BLOC-013** (P3) — pagini legale → fetch din Legal hub (**atinge Legal = al 2-lea NO-TOUCH → sesiune separată**; = „fresh items 1+2" handoff)
- [ ] **G-BLOC-012-rest** (P2) — TOCTOU pe claim roata · **G-BLOC-014** (P3) — webhook 400 + CONSUM bill-0

## [ ] 🚀 Build motor viral (specuri gata din STRATEGY.md — creat 2026-05-31)

- [ ] **`/cat-costa`** — educatorul public de întreținere (spec build-ready: `knowledge/spec-cat-costa.md`). Vectorul de conținut viral + SEO. ~1 săpt. Precondiție cifre: G-BLOC-009.
- [ ] **`/cere-blocx`** — demand-pull proprietar→admin (vectorul viral #1; spec în `knowledge/viral-loop-spec.md`). ~1–1.5 săpt. Emite lead → MA nurture.
- [ ] Defalcare-transparență în portal (post-plată) + bridge spre `/roata`. ~3–5 zile.
- [ ] Referral pe luni gratis (înlocuiește XP) + pitch firme de administrare.

## BlocHub (`blocx.ro`) — NO-TOUCH CRITIC (toate = PROPUNERI, se aplică doar cu confirmul tău)
Sursă: `blochub/Reports/INTROSPECTION-2026-06-20/`

- [ ] 🔴 **Decizie Float→Decimal pe banii din DB** — 33 câmpuri `Float`, 0 `Decimal` (~25 sunt bani: sume/sold/preț/penalizări). Float pe bani = erori de rotunjire în timp. Schimbare de schemă pe prod-live → sesiune dedicată cu backup `pg_dump`. Confirmă să o programez.
- [ ] 🔴 **Aprobă fix atomicitate + idempotență pe webhook-ul de plată** — `payments/webhook` face update→aggregate→update→create secvențial fără `$transaction`; un retry Stripe poate procesa plata de două ori. Risc direct pe bani.
- [ ] 🔴 **Aprobă sesiune de dependențe** — 15 vulnerabilități (1 critică `jspdf`; `xlsx` HIGH fără fix → mitigare). NU fac `audit fix --force` orb pe NO-TOUCH.
- [ ] 🟡 **GDPR** — categorii de cookie + buton „Refuză tot" + Google Analytics doar după consimțământ + retenție date. Confirmă entitatea legală (Class RDA via Legal Hub) + textul.
- [ ] 🟡 **Confirmă revizuirea izolării multi-tenant** — anti-IDOR cross-asociație pe rutele cu auth dar fără scoping `asociatieId`.
- [ ] 🟢 **Trust/SEO** (scor Trust 55) — 6 linkuri rupte de reparat + info contact reale + conținut de încredere.
- [ ] 🟢 (opțional) Rotire secrete VPS2 + CSP cu nonce (termen lung).

---

## BlocHub (`blocx.ro`) — NO-TOUCH CRITIC (toate = PROPUNERI, se aplică doar cu confirmul tău)
Sursă: `blochub/Reports/INTROSPECTION-2026-06-20/`

- [ ] 🔴 **Decizie Float→Decimal pe banii din DB** — 33 câmpuri `Float`, 0 `Decimal` (~25 sunt bani: sume/sold/preț/penalizări). Float pe bani = erori de rotunjire în timp. Schimbare de schemă pe prod-live → sesiune dedicată cu backup `pg_dump`. Confirmă să o programez.
- [ ] 🔴 **Aprobă fix atomicitate + idempotență pe webhook-ul de plată** — `payments/webhook` face update→aggregate→update→create secvențial fără `$transaction`; un retry Stripe poate procesa plata de două ori. Risc direct pe bani.
- [ ] 🔴 **Aprobă sesiune de dependențe** — 15 vulnerabilități (1 critică `jspdf`; `xlsx` HIGH fără fix → mitigare). NU fac `audit fix --force` orb pe NO-TOUCH.
- [ ] 🟡 **GDPR** — categorii de cookie + buton „Refuză tot" + Google Analytics doar după consimțământ + retenție date. Confirmă entitatea legală (Class RDA via Legal Hub) + textul.
- [ ] 🟡 **Confirmă revizuirea izolării multi-tenant** — anti-IDOR cross-asociație pe rutele cu auth dar fără scoping `asociatieId`.
- [ ] 🟢 **Trust/SEO** (scor Trust 55) — 6 linkuri rupte de reparat + info contact reale + conținut de încredere.
- [ ] 🟢 (opțional) Rotire secrete VPS2 + CSP cu nonce (termen lung).

---

## 🔍 Introspection Audit 2026-06-20
> Audit complet (gap strategie↔cod · ghid per-pagină · deep research · funcțional + cyber).
> **Scor AIWebAuditor: 83/100** · GDPR 80. 7 acțiuni deschise · 🔴 3 critice.
> Rapoarte: `Reports/INTROSPECTION-2026-06-20/` (00-SUMMARY.md, 01-gap-strategy-vs-code.md, 02-pages-guide-RO.md, 03-deep-research-optimization.md, 04-audit-findings.md, 04b-security-audit.md)
> Checklist Alex centralizat: `Master/reports/Alex_TODO_2026-06-20.md` + tab „Introspection Audit" în UI Master.

## BlocHub (`blocx.ro`) — NO-TOUCH CRITIC (toate = PROPUNERI, se aplică doar cu confirmul tău)
Sursă: `blochub/Reports/INTROSPECTION-2026-06-20/`

- [ ] 🔴 **Decizie Float→Decimal pe banii din DB** — 33 câmpuri `Float`, 0 `Decimal` (~25 sunt bani: sume/sold/preț/penalizări). Float pe bani = erori de rotunjire în timp. Schimbare de schemă pe prod-live → sesiune dedicată cu backup `pg_dump`. Confirmă să o programez.
  - 🗣️ *Pe înțelesul tău:* Sumele de bani sunt ținute ca numere aproximative, care în timp pot să nu se închidă la sfârșit de lună (un ban-doi în plus/minus). Schimbarea le face exacte — important înainte de a arăta cifre publice administratorilor.
- [ ] 🔴 **Aprobă fix atomicitate + idempotență pe webhook-ul de plată** — `payments/webhook` face update→aggregate→update→create secvențial fără `$transaction`; un retry Stripe poate procesa plata de două ori. Risc direct pe bani.
  - 🗣️ *Pe înțelesul tău:* Dacă Stripe retrimite o confirmare de plată, sistemul poate înregistra plata de două ori — bani contabilizați greșit. Fixul pune o plasă de siguranță ca o plată să conteze o singură dată.
- [ ] 🔴 **Aprobă sesiune de dependențe** — 15 vulnerabilități (1 critică `jspdf`; `xlsx` HIGH fără fix → mitigare). NU fac `audit fix --force` orb pe NO-TOUCH.
  - 🗣️ *Pe înțelesul tău:* Câteva biblioteci externe (în special cea de generat PDF-uri și cea de citit Excel) sunt învechite și au găuri. Fiind site live cu bani, nu le ating orbește — aprobă o sesiune și le curăț cu testare după.
- [ ] 🟡 **GDPR** — categorii de cookie + buton „Refuză tot" + Google Analytics doar după consimțământ + retenție date. Confirmă entitatea legală (Class RDA via Legal Hub) + textul.
  - 🗣️ *Pe înțelesul tău:* Bannerul de cookie e incomplet și urmărirea pornește posibil înainte de acord — risc de reclamație. După fix ești în regulă cu legea protecției datelor.
- [ ] 🟡 **Confirmă revizuirea izolării multi-tenant** — anti-IDOR cross-asociație pe rutele cu auth dar fără scoping `asociatieId`.
  - 🗣️ *Pe înțelesul tău:* Vreau să verific că un user dintr-o asociație nu poate vedea datele altei asociații. E o verificare de siguranță — confirmă să o fac.
- [ ] 🟢 **Trust/SEO** (scor Trust 55) — 6 linkuri rupte de reparat + info contact reale + conținut de încredere.
  - 🗣️ *Pe înțelesul tău:* Pe pagina de prezentare, 6 linkuri duc în gol și nu se vede contact sau dovadă că ai clienți reali — exact la momentul deciziei, omul pleacă. Reparate, câștigi încredere.
- [ ] 🟢 (opțional) Rotire secrete VPS2 + CSP cu nonce (termen lung).
  - 🗣️ *Pe înțelesul tău:* Igienă de securitate pe termen lung — schimbat parolele de server și o întărire suplimentară a paginii. Opțional, nu urgent.

---

## [ ] 🧩 Module reuse gap (propus 2026-06-27, din matricea Lego Master)

- [ ] **+ AICR — bannere pentru anunțuri** (`@aledan/aicr`) — identificat via `/matrix`
  - **De ce aici**: BlocHub trimite anunțuri către locatari (HOA); un banner-imagine generat face anunțul mai vizibil/profesionist. ECOSYSTEM_REGISTRY: „Planned: BlocHub announcement banners".
  - **Integrare**: `file:../AICR`; `import { generateImage } from '@aledan/aicr'` (server-side, Gemini Imagen primary → OpenAI fallback). Chei din `Master/credentials/.env.shared`. Telemetrie `Master/metrics/aicr/blochub.jsonl`.
  - **Suprafața**: la crearea unui anunț (modulul de announcements), buton opțional „generează banner" → atașează imaginea la anunț.
  - **Governance**: blochub = NO-TOUCH CRITIC — **NU atinge `src/app/api/payments/*`**; feature-ul e pe announcements, departe de money-path. propose-confirm-apply §2d. AICR = al 2-lea+ consumator → §6.1.
  - **Verificare**: build; smoke `generateImage`; anunț cu banner randează în UI locatar.
