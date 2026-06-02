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

## [ ] 📖 Manual de utilizare + verdict „produsul se auto-explică?" (creat 2026-06-01)

**Cerință user:** „Presupune că ești nou intrat pe site-ul aplicației și vrei să știi ce face și cum o folosești. Ai aici tot ce-ți trebuie? Fă un sumar cu ce face + ce butoane trebuie apăsate ca să ajungi aici — un manual."

**De livrat:**
1. **Manual de utilizare** (RO) — pas cu pas, din perspectiva unui user complet nou: ce face BlocX + traseul de butoane/click-uri pentru fiecare capabilitate majoră (signup → onboarding asociație → clădire/scări/apartamente → proprietari → cheltuieli → repartizare → chitanțe → încasări/plăți → tichete → portal proprietar). Pentru fiecare: „ca să ajungi aici, apeși X → Y → Z".
2. **Verdict onest de auto-explicabilitate:** „un user nou are TOT ce-i trebuie ca să se descurce singur?" — unde se blochează, unde lipsesc indicii (tooltips, empty-state guidance, wizard, help), unde trebuie să ghicească. Acoperă AMBELE roluri (vezi decizia #1 mai jos).
3. Output: `knowledge/MANUAL.md` (manualul) + secțiune „Gaps de onboarding/UX" în raport.

## [ ] 🧪 Test UI real / journey / TGW din perspectiva user-ului NOU (creat 2026-06-01)

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
