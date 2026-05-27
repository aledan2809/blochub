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
