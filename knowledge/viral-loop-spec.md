# Viral Loop — Spec de implementare (BlocX.ro)
Created: 2026-05-31 · Owner: product · Status: SPEC (neimplementat)

> Companion la `STRATEGY.md` §3 (bucla virală). Trei features care, împreună, formează motorul:
> Educator public → „Cere BlocX" (demand-pull) → Roata (ucide obiecția-preț) → adopție → transparență → share.
> Niciuna nu atinge payment-core NO-TOUCH; sunt suprafețe NOI (risc mic). Anti-abuse + metrici incluse.

---

## Feature 1 — Educator public de întreținere ("Cât costă de fapt") · vectorul de conținut viral

**User story:** Ca proprietar furios că „întreținerea e prea mare", intru pe o pagină publică (fără cont), îmi introduc câteva cifre de pe avizier, și BlocX îmi explică pe înțeles fiecare rând, ce e normal și unde s-ar putea să plătesc prea mult — apoi îmi spune cum să obțin transparența reală pe blocul meu.

**Surface:** `/cat-costa` (sau `/transparenta`) — public, no-login, SSR, SEO-first (țintă căutări „de ce e întreținerea așa mare", „cum se calculează întreținerea").

**Flux:**
1. Input simplu: tip cheltuieli + sume (sau „urcă poza avizierului" → OCR-ul existent de facturi/index, refolosit).
2. Output: defalcare animată + explicații per rând în limbaj uman ("Apa rece = pe consum/contor; dacă n-ai contor, plătești pe persoană") + benchmark ("media pt un 2-camere în oraș: ~X lei") + **semnale roșii** ("fond de reparații >25% fără proiect anunțat = cere lămuriri la adunare").
3. AI explainer = AIRouter (text, RO) — refolosește pattern-ul de chatbot existent. Fără PII, fără DB write.
4. CTA dublu: **(a)** „Vrei asta REAL, lunar, pe blocul tău? → **Cere BlocX administratorului tău**" (Feature 2). **(b)** „Ești chiar tu administrator? → Încearcă gratuit până la 12 luni" → `/roata`.

**Shareable artifact:** buton „Descarcă/Distribuie defalcarea" → imagine OG generată (Next OG image) cu defalcarea + „explicat de BlocX.ro". Asta e ce intră în grupul de WhatsApp/FB al blocului.

**Anti-abuse:** rate-limit IP pe OCR (refolosește `checkRateLimit`); fără persistență → fără cost de date.

**Metrici:** vizite `/cat-costa`, share-uri OG, click CTA(a)/(b), assist→„Cere BlocX".

**Efort estimat:** ~1 săpt (pagină + AI explainer + OG image + benchmark seed). Refolosește OCR + AIRouter + rate-limit existente.

---

## Feature 2 — „Cere BlocX pentru blocul meu" · demand-pull (vectorul viral #1)

**User story:** Ca proprietar dintr-un bloc FĂRĂ BlocX, completez 3 câmpuri (adresă bloc + emailul/telefonul administratorului, opțional) și BlocX trimite administratorului meu un pitch pre-scris („proprietarii tăi cer transparență; ai gratis până la 12 luni"). Eu primesc confirmare; voi primiți un lead cald.

**Surface:** `/cere-blocx` (public) + buton injectat ca CTA(a) în Feature 1 + în portalul proprietarului (dacă blocul nu e încă pe BlocX — caz pt expansiune în blocuri vecine).

**Flux + date:**
1. Form public: `adresaBloc`, `judet/oras`, `emailAdmin?`, `telefonAdmin?`, `numeSolicitant?`, `emailSolicitant`.
2. Persistă într-un model NOU `CerereBlocX` (lead) — NU atinge schema payment. Câmpuri: id, contact admin, contact solicitant, count cereri/bloc (agregare: „14 proprietari din acest bloc au cerut deja BlocX" = social proof + prioritizare lead).
3. **Outreach automat:** dacă `emailAdmin` dat → email pre-scris către admin (refolosește `@aledan/email` / canalele din referral). Dacă nu → lead intră la sales.
4. **Wiring MA:** emite eveniment către MarketingAutomation (există receiver `/api/external/...` + pipeline de nurture) → secvență de follow-up pe admin: zi 0 pitch, zi 3 „X proprietari cer", zi 7 „roata expiră". *(MA face nurture-ul; BlocX doar emite lead-ul + countul per bloc.)*
5. Răspuns către admin → CTA „Încearcă gratis până la 12 luni" → `/roata`.

**Bucla-cheie:** agregarea „N proprietari din același bloc au cerut" transformă cereri individuale în presiune colectivă pe admin = exact demand-pull-ul de jos.

**Anti-abuse:** rate-limit IP + email-verify pe `emailSolicitant` (evită spam/cereri false pe un admin); dedup per (bloc, solicitant).

**Metrici (North Star feed):** cereri/lună, cereri/bloc, conversie cerere→signup admin, % asociații noi atribuite acestui canal.

**Efort estimat:** ~1–1.5 săpt (form + model lead + outreach + MA event). Model nou izolat, zero risc payment.

---

## Feature 3 — Defalcare-de-transparență shareable (post-adopție, în portal) + bridge spre Roata

**User story (proprietar într-un bloc CU BlocX):** După ce plătesc (sau oricând), văd „Pe ce s-au dus banii tăi luna asta": defalcare per categorie + „blocul tău vs media orașului" + istoric — și pot distribui o imagine curată.

**Surface:** `/portal` → card „Transparență" (extinde portalul existent, care e azi subțire: chitanțe/avizier/sesizări/plăți).

**Date:** **refolosește ce există deja** — `Chitanta.detalii` (line items: denumire + sumă per cheltuială, mod repartizare). E doar un strat de prezentare peste date existente + un benchmark agregat. ZERO schema nouă.

**Bridge spre promo (ideea ta #2):** pe pagina publică de pricing + în orice punct unde apare obiecția de preț:
> „Ți se pare BlocX scump? Încearcă-l gratuit până la 12 luni." → buton → `/roata` (promo early-adopter existentă, cap 20×12 luni, `src/lib/roata.ts`).

MA rulează campaniile de awareness care duc trafic spre `/cat-costa` și `/roata` (roata = feature blochub; MA = motorul de campanii).

**Metrici:** proprietari activi/bloc, share-uri defalcare, click pricing→roata, conversie roata→signup.

**Efort estimat:** ~3–5 zile (prezentare peste date existente + OG share + benchmark). Cel mai ieftin, mare impact emoțional.

---

## Ordinea de build (per STRATEGY §8)
1. Feature 1 (educator public) — aprinde achiziția.
2. Feature 2 („Cere BlocX") — închide demand-pull-ul.
3. Feature 3 (transparență portal + bridge roata) — alimentează share-ul post-adopție.
4. Apoi: referral pe luni gratis (înlocuiește XP) + pitch firme de administrare.

## Precondiții (din audit, blochează „push pe transparență")
- Repartizare corectă: G-BLOC-006 ✅ (denominator), G-BLOC-009 ⏳ (Decimal/rounding — recomandat înainte de a expune cifrele public).
- Izolare date: IDOR ✅ închis 2026-05-31 (transparența NU poate scurge date cross-bloc).

## Cross-refs
- `STRATEGY.md` §3 (bucla), §5 (North Star), §6 (tensiunea transparență↔admin).
- Roata: `src/lib/roata.ts`, `/roata`, model `EarlyAdopterRegistration`.
- Referral existent: `src/app/api/referral/route.ts` (de migrat XP→luni).
- MA: pipeline nurture + receiver evenimente externe (vezi ECOSYSTEM_REGISTRY MarketingAutomation).
