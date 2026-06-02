# BlocX — Test UI real / Journey din perspectiva user-NOU + verdict auto-explicabilitate

**Dată:** 2026-06-02
**Mediu:** PRODUCȚIE — `https://blocx.ro` (VPS2, NO-TOUCH CRITIC payment)
**Mod:** Direct (zero fix automat — toate gap-urile = OPEN, propose-confirm-apply per CLASSIFICATION §2d)
**Metodă:** browser real (Chromium/Playwright headless, screenshots full-page + analiză vizuală) + journey-audit + cod sursă ca ground-truth + DB read pe VPS2
**Conturi test (cleanup la final):** `journey-newuser@blochub.app` (ADMIN), `journey-proprietar@blochub.app` (PROPRIETAR)
**Decizii start (user):** Direct · acoperire admin-complet + proprietar din invitație · cont nou pe PROD cu fixture+cleanup · TGW inclus

> ⚠️ **Notă de onestitate metodologică.** Screenshot-urile au fost captate cu Chromium **headless** (nu fereastră vizibilă), dar pixelii de layout sunt identici cu headed. Heuristicile regex din scripturi au dat fals-pozitive (ex. „errText" pe fiecare pagină) — **NU m-am bazat pe ele**; fiecare concluzie de mai jos e susținută de (a) screenshot real analizat vizual, (b) răspuns API/network capturat, sau (c) cod sursă citit. Unde nu am putut verifica complet, scrie explicit.

---

## Rezumat executiv

Am parcurs traseul real al unui **user complet nou**, pe ambele roluri, pe producție. Concluzia onestă:

- **Adminul nou poate ajunge la valoare**, dar cu fricțiune mare și fără ghidaj: există un wizard de onboarding frumos construit care **NU e conectat** (cod mort), iar utilizatorul primește în loc un mesaj sec „adaugă prima clădire".
- **Proprietarul nou NU poate intra deloc** prin fluxul normal: linkul de invitație duce la „Invitație Invalidă" din cauza unui **bug real de middleware** (P1, producție).
- **Auto-explicabilitate:** un proprietar vede *cât* are de plătit, dar **nu vede de ce** (defalcarea pe cheltuieli/cotă există în date, dar nu e expusă în portal).

**Verdict „un user nou se descurcă singur?":** **Parțial pentru admin (cu fricțiune), NU pentru proprietar (blocat).**

---

## Ce a mers (pozitiv, verificat)

| Aspect | Dovadă |
|---|---|
| Homepage clară cu CTA-uri puternice („Începe Gratuit - 0 lei", „Trial 14 Zile", Demo, Prețuri) | `admin/01-homepage.png` + 10 CTA-uri către `/auth/register` |
| Înregistrare admin funcțională (fără email-verify gate) → login imediat | `register-after-submit` → `/auth/login?registered=true`; login OK → `/dashboard` |
| Creare asociație + clădire + scări + apartamente via API: toate `200/201` | `setup-log.json` (asociatie `cmpwc3inm…`, 2 apartamente create) |
| Generare chitanțe deterministă (motor `calcul-chitanta`, fără credit AI) | `/api/chitante/generate` → `200`, breakdown `detalii[]` corect |
| Sidebar cu sub-etichete utile + „Întreabă AI" (asistent în context) | `admin/12-motor-cheltuieli.png` |
| journey-audit admin: **14 OK / 3 GATED** (= baseline, fără regresie) | `journey-audit-results/blochub/report.json` |
| Pagini legale 200 (privacy/terms/regulament) | pre-flight curl 200/200/200 |

---

## Gap-uri (onest, cu severitate + dovadă)

> Numerotare continuă după G-BLOC-014 existent. Toate **OPEN** — niciun fix aplicat (NO-TOUCH).

### 🔴 P1 — blochează un rol întreg

**G-BLOC-015 [P1] — Acceptarea invitației de proprietar e RUPTĂ în producție.**
`middleware.ts:51` include `'/api/invitations/:path*'` în matcher-ul `withAuth` (`authorized: ({token}) => !!token`). Endpoint-ul **public** de verificare/acceptare `/api/invitations/accept` (GET verify + POST accept) este astfel auth-gate-uit → un invitat **delogat** (care prin definiție nu are cont) e redirecționat la `/api/auth/signin` → pagina `/invite/[token]` afișează **„Invitație Invalidă — Eroare la verificarea invitației"**.
**Efect:** întreg onboarding-ul proprietarilor prin link de invitație e nefuncțional. Adminul nu-și poate aduce locatarii în aplicație.
**Dovadă:** `proprietar/01-invite-landing.png` + `curl /api/invitations/accept?token=…` → 302 spre `/api/auth/signin` + cod middleware. Token valid, neexpirat (DB confirmat).
**Inconsistență internă:** GET handler-ul e marcat explicit `// GET ... (public)` în `route.ts:14` și nu cheamă `getServerSession` — deci intenția era public, dar matcher-ul îl prinde. Comentariul matcher-ului zice chiar „exclude public ones" — dar `/accept` nu a fost exclus.
**Fix propus (de confirmat):** exclude `/api/invitations/accept` din matcher (negative pattern sau mutare pe sub-path public). NU am aplicat — middleware-ul atinge auth global (zonă sensibilă).

### 🟠 P2 — fricțiune mare / inconsistență

**G-BLOC-016 [P2] — Wizard de onboarding orfan (cod mort).**
`function SetupWizard()` (`dashboard/page.tsx:638`, ~300 linii) implementează un onboarding ghidat în 4 pași (Asociație → Scări → Tipuri apartament → Finalizare; creează automat asociație+clădire+scări+apartamente). **Zero utilizări** în tot `src/` (grep confirmat). În locul lui, adminul nou vede empty-state-ul sec din `DashboardPage` (`page.tsx:135-160`): „Bun venit in BlocX! adaugă prima ta clădire din meniul din stânga". S-a construit un onboarding bun și nu e conectat.

**G-BLOC-017 [P2] — Eticheta primului pas e înșelătoare.**
Fluxul real (live) e modalul `AddBuildingModal` (deschis din sidebar „Adaugă prima clădire") — dar el colectează 4 câmpuri de **asociație** (nume/adresă/oraș/județ) și face `POST /api/asociatii` (creează o **asociație**, nu o clădire), apoi salvează `currentAsociatieId` în localStorage. User-ul nou crede că adaugă o clădire, de fapt creează asociația.

**G-BLOC-018 [P2] — Paginile de date arată spinner infinit fără asociație.**
Cu un admin fără asociație configurată, `/dashboard/cheltuieli` (și altele) afișează un **spinner de încărcare care nu se termină**, în loc de un gate „configurează întâi asociația" sau redirect către onboarding.
**Dovadă:** `admin/12-motor-cheltuieli.png` (spinner centrat, fără conținut).

**G-BLOC-019 [P2] — Proprietarul aterizează pe /dashboard (rută de admin), nu pe /portal.**
La login, un PROPRIETAR e dus la `/dashboard` (empty-state-ul de admin „adaugă prima clădire"), nu la `/portal`. Trebuie să navigheze manual la portal.
**Dovadă:** portal walk: „after login url=https://blocx.ro/dashboard".

### 🟡 P3 — claritate / cosmetic (dar reale)

**G-BLOC-020 [P3] — Auto-explicabilitate: proprietarul vede *cât*, nu *de ce*.**
Defalcarea pe linii (`detaliiJson`: denumire/tip/sumă per cheltuială) e **calculată și stocată**, dar **NU e expusă** de `/api/portal/chitante` (returnează doar subtotaluri pe categorii: întreținere/restanță/penalizare/fonduri). Pagina `/portal/payments` afișează doar `sumaTotal`/`sumaRamasa`. Pe avizier, secțiunea **„Defalcare pe Categorii" se randează GOALĂ**.
**Dovadă:** `api/portal/chitante/route.ts:60-78` (mapping fără `detalii`), `portal/payments/page.tsx:194`, `proprietar/CLEAN-avizier.png`.
**Verdict:** un locatar nou **nu poate justifica singur** de ce datorează suma X — vede totalul, dar nu cheltuielile și metoda de repartizare care l-au produs.

**G-BLOC-021 [P3] — Date mock de contoare în portalul de producție.**
`portal/page.tsx:42-44` are hardcodat un array de contoare (Apă rece 245, Apă caldă 87, Gaz 1250 mc) care se afișează în portalul live indiferent de datele reale.
**Dovadă:** `proprietar/11-portal-portal.png` („245 mc / 87 mc / 1250 mc").

**G-BLOC-022 [P3] — Overlay de gamification + cookie acoperă onboarding-ul la primul login.**
La primul login al adminului, un modal „Nivel nou! Începător" („Călătoria ta începe") + bannerul de cookie se suprapun peste dashboard, acoperind ghidajul (deja slab) de onboarding. Se sărbătorește „level up" înainte ca user-ul să fi făcut ceva.
**Dovadă:** `admin/06-after-login.png`.

**G-BLOC-023 [P3] — Sumarul de avizier omite categoria Fonduri → matematica pare inconsistentă.**
„Sumar Cheltuieli" arată Întreținere/Restanțe/Penalizări/General, dar **nu** și „Fonduri". Cu fonduri 60 + restanțe 60, apare „Total Restanțe 60" dar „Total General 120" — fără linia de fonduri care explică diferența.
**Dovadă:** `proprietar/CLEAN-avizier.png`.

**G-BLOC-024 [P3] — Regenerarea chitanțelor creează duplicate (nu înlocuiește luna).**
Două rulări `generate` pe aceeași lună/an au produs chitanțe noi (numărul a sărit 1 → 3) + au transformat totalul precedent în restanță, în loc să actualizeze/înlocuiască chitanța lunii. Risc: chitanțe duplicate + restanță inflată. (Posibil înrudit cu G-BLOC-005 generate-atomicity.)
**Dovadă:** `/tmp/gen-chit.log` + `gen2` (numar 1 → 3, sumaRestanta 0 → 30 → 60).

**G-BLOC-025 [P3] — Prima cheltuială cere obligatoriu furnizor.**
`POST /api/cheltuieli` respinge cu „Furnizorul este obligatoriu". Un admin nou nu poate înregistra o cheltuială simplă fără să creeze întâi un furnizor; nu am observat un quick-add inline.

**G-BLOC-026 [P3] — Race de hidratare React la login (recurență G-JOURNEY-LOGIN-001).**
Login-ul trimis înainte de hidratare (`domcontentloaded`) e respins (bounce la `/auth/login?callbackUrl`); cu `networkidle` merge. Afectează tooling-ul automat și, posibil, utilizatori rapizi pe conexiuni lente.

### ℹ️ Tooling (Master / TGW-side, nu blochub)

**G-BLOC-TGW-001 — TGW critical-flows nu rulează pentru blochub.**
`Tester-Gateway/apps/blochub.json` are erori de schemă (validator TGW îl respinge) + `BLOCHUB_TEST_EMAIL` lipsește din `Tester-Gateway/.env` (există doar `BLOCHUB_TEST_PASSWORD`). TGW a fost **repornit cu tokenul curent** (verificat: 200 cu token / 403 fără) — dar rularea criticalFlows e blocată de cele de mai sus. Pentru testul de user-NOU, walk-urile custom (cu analiză vizuală a screenshot-urilor) au oferit acoperire mai profundă decât cele 3 criticalFlows generice (care testează login admin existent + pagini legale, deja verde).

**INFO:** 4 erori `404` în consolă pe homepage (resursă/asset lipsă).

---

## Friction-to-first-value (admin nou)

| Pas | Acțiune | Fricțiune |
|---|---|---|
| 1 | Homepage → „Începe Gratuit" → `/auth/register` | OK, clar |
| 2 | Completează nume/email/parolă/confirmă + bifă termeni → submit | OK (fără verificare email) |
| 3 | Login | OK (dar race de hidratare la conexiuni lente — G-BLOC-026) |
| 4 | Primul ecran: overlay gamification + cookie + empty-state sec | **Fricțiune** (G-BLOC-022, G-BLOC-016) |
| 5 | „Adaugă prima clădire" (de fapt creează asociația) | **Confuz** (G-BLOC-017) |
| 6 | Apoi manual: Clădire → Scări → Apartamente → Proprietari → Cheltuieli (furnizor obligatoriu) → Generează | **Fricțiune mare** — fără wizard ghidat (G-BLOC-016, G-BLOC-025); paginile arată spinner până configurezi (G-BLOC-018) |
| 7 | Invită proprietari | **BLOCAT pentru proprietar** (G-BLOC-015) |

---

## Verdict final auto-explicabilitate

- **Admin nou:** produsul **NU se auto-explică suficient**. Există ghidaj parțial (sub-etichete în sidebar, „Întreabă AI"), dar onboarding-ul ghidat e deconectat (G-BLOC-016), primul pas e etichetat greșit (G-BLOC-017), iar paginile de date nu spun „configurează întâi" (spinner infinit, G-BLOC-018). Un manual scris (livrat: `knowledge/MANUAL.md`) e necesar **acum**; ideal, reconectarea `SetupWizard` ar rezolva 80% din fricțiune.
- **Proprietar nou:** nu ajunge nici măcar să testeze auto-explicabilitatea — e **blocat la poartă** (G-BLOC-015). Chiar și după intrare (test cu cont creat manual în DB), **nu vede de ce plătește** (G-BLOC-020).

**Recomandare de prioritizare:** G-BLOC-015 (P1, deblochează proprietarii) → G-BLOC-016 (reconectează wizardul) → G-BLOC-018/017 (gate + etichetă) → G-BLOC-020 (expune defalcarea în portal). Toate prin propose-confirm-apply (NO-TOUCH).

---

## Artefacte

- Screenshots admin: `Reports/newuser-journey-2026-06-02/admin/*.png`
- Screenshots proprietar: `Reports/newuser-journey-2026-06-02/proprietar/*.png`
- Loguri walk: `admin/walk-log.json`, `setup-log.json`, `proprietar/*-log.json`
- journey-audit: `journey-audit-results/blochub/report.json` (14 OK / 3 GATED)
- Manual utilizare: `knowledge/MANUAL.md`
