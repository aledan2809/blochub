# TODO Persistent — BlocHub

> Read at start of EVERY session on this project. Items stay until marked `[x]` with date + commit.

**Project safety**: NO-TOUCH CRITIC for payment flows (`src/app/api/payments/*`) — rest is ACTIVE. | **Production**: blocx.ro (VPS2, port 3011)

---

## [ ] 🎯 Early-adopter offer page (creat 2026-05-26)

**Origin:** maxi-campania de recrutare administratori (tracked în `MarketingAutomation/TODO_PERSISTENT.md` "BlocHub maxi campanie early-adopter"). Pagina e destinația ("aterizarea") ofertei.

**Cerință (user 2026-05-26):** pagină publică pe blocx.ro unde primii administratori își revendică luni gratis.
- **Oferta:** intern 12→6 luni gratis, **-1 lună/săptămână, locuri limitate**. **Public: DOAR oferta curentă + urgență** ("nu se știe câte luni vor mai fi gratis săptămâna viitoare — grăbește-te"); NU afișa programul de scădere.
- **Conținut pagină:** tier curent (X luni) + **contor locuri rămase** + **formular înscriere administrator** (nume, asociație/bloc, email, telefon, oraș).
- **Logică:** tier-by-week (calculează luna curentă din săptămâna de start) + count înscrieri per tier (locuri limitate).

**Governance:** ⚠️ NU atinge `src/app/api/payments/*` (NO-TOUCH CRITIC). Pagina de ofertă = înscriere/lead (model nou `EarlyAdopterRegistration` sau similar), NU plăți. Build izolat (fișiere noi). Prisma 5 migrare pe DB-ul VPS2 (self-hosted PG, DBM-migrated) — cu grijă.
- Public page (ex. `/oferta`), API route înscriere, model lead, contor.
- Verifică: pagina publică se încarcă, formularul salvează lead, contorul scade.

**Status:** spec gata (sesiune dedicată pt build, ca să nu se facă pe finalul unei sesiuni lungi).
