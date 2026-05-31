# Strategy — BlocHub (BlocX.ro)
Last Updated: 2026-05-31

> Sursă de adevăr pentru poziționare, WOW și bucla de creștere. Înlocuiește template-ul gol din 2026-02-15.
> Context: produs aproape complet funcțional (49 modele, ~72 API routes, 6 AI agents, plăți Stripe+Revolut,
> portal proprietari, gamification, referral, promo „Roata"). Faza actuală = pre-launch / primii clienți.

---

## 1. Vision
**BlocX face transparente costurile de bloc — și i le explică proprietarului.**
Nu „încă un soft de contabilitate pentru administratori", ci aliatul proprietarului împotriva opacității,
care din întâmplare îi ușurează administratorului 95% din muncă. Misiunea (anti-opacitate) e ceea ce
transformă produsul dintr-un utilitar într-o mișcare care se răspândește.

## 2. Cine e WOW-ul — și care e emoția (definit explicit, lipsea)
| Public | Emoția-țintă (una) | Momentul WOW |
|---|---|---|
| **Proprietar** (publicul viral) | „În sfârșit înțeleg și VĂD pe ce se duc banii mei." | Vede defalcarea clară: X% reparații, Y% curățenie, vs media orașului → screenshot în grupul blocului |
| **Administrator** (cumpărătorul) | „30 de secunde, nu 3 zile — și arăt impecabil la adunarea generală." | Generează chitanțele pe tot blocul în 30s; poză contor → index prin OCR |
| **Firmă de administrare** (multiplicatorul) | „Gestionez 40 de blocuri dintr-un loc, fără reclamații." | Onboarding multi-building + raport de transparență per asociație |

**Anti-pattern:** landing-ul actual *spune* WOW (numărători 95% / 30 sec). WOW-ul trebuie *arătat* (video OCR din poză, defalcare animată), nu numărat.

## 3. Bucla virală (centrul strategiei — nu exista)
```
  Proprietar frustrat ("de ce e întreținerea așa mare?")
        │
        ▼
  [Educator public de întreținere]  ← conținut viral, fără login, merge pt ORICE bloc
   "Ce înseamnă fiecare rând / cât e normal / semnale roșii"
        │ share în grup bloc/FB + CTA
        ▼
  ["Cere BlocX pentru blocul meu"]  ← demand-pull de JOS (vectorul viral #1)
   pitch pre-completat trimis administratorului → lead cald pt noi
        │
        ▼
  [Obiecția de preț ucisă]  "Ți se pare scump? E gratis până la 12 luni → Roata"  (blocx.ro/roata)
        │
        ▼
  Administrator adoptă → proprietarii din bloc primesc transparența REALĂ
        │ ei dau screenshot + recomandă mai departe
        └──────────────────► (bucla se reia, K crește)
```
**Cheia:** transparența standalone se aprinde doar *post-adopție*; **educatorul public** e ce o face motor de achiziție. Demand-pull-ul de jos (proprietar → admin) e singurul vector cu adevărat viral într-o categorie B2B altfel cu K mic.

## 4. Segmente & priorități de creștere (onest, nu „totul deodată")
1. **Demand-gen pe proprietari** (motorul viral) — educator public + „Cere BlocX".
2. **Firme de administrare** (multiplicatorul de venit) — 1 firmă = 10–50 blocuri. *Aceasta* e creșterea reală, nu viralitatea consumer. Sales-led, nu viral.
3. **Admini independenți** — convertiți din demand-pull + referral pe bani/luni (NU pe XP).

## 5. North Star & metrici (ca să nu ne mințim că „e viral")
- **North Star:** % din asociațiile noi venite din **demand-pull de proprietar** ("Cere BlocX"). >30% = chiar avem viralitate; <10% = model sales-led, și e ok să recunoaștem.
- K-proxy: share-uri pagină educator · cereri „Cere BlocX"/lună · conversie cerere→signup admin · proprietari activi/bloc.
- Sanity: dacă după lansarea buclei (§3) demand-pull-ul nu mișcă, **acceptăm că modelul e sales-led pe firme** — nu turnăm încă un feature de gamification.

## 6. Constraints (ce ne poate omorî)
- **Tensiunea transparență vs adopție admin:** transparența e pro-proprietar, dar unii admini se tem de scrutin. Mitigare: vinde-o adminului ca beneficiu (mai puține reclamații, adunare fără scandal, „arăți cinstit"), nu ca amenințare.
- **Corectitudinea e precondiție:** transparent-dar-greșit = anti-viral instant. Repartizarea (G-BLOC-006/009) și izolarea datelor (IDOR, închis 2026-05-31) trebuie impecabile ÎNAINTE de a împinge transparența. Vestea proastă circulă de 10× mai repede.
- **Categorie cu K mic pe admin:** „viral ușor" pur consumer e nerealist; bara corectă = lider word-of-mouth în nișă + cârlig de rezident.

## 7. Pârghiile actuale — verdict sincer
- **Referral pe XP** → nepotrivit cu adminul (nu „grindează" puncte). **Reorientează pe bani/luni.**
- **Gamification (niveluri/inel)** → risc de gimmick pentru un admin de 55 ani; păstrează minimal, nu investi.
- **Roata (până la 12 luni gratis, cap 20)** → bun *launch hook* (raritate + luni gratis), dar e un *pull unic*, nu o buclă. Rolul corect: ucigaș de obiecție-preț la finalul funnel-ului.

## 8. Secvențializare (pariuri, în ordine)
1. **Educator public de întreținere** (`/cat-costa` sau `/transparenta`) — conținut viral fără login. *(spec → `knowledge/viral-loop-spec.md`)*
2. **„Cere BlocX pentru blocul meu"** — demand-pull. *(spec → idem)*
3. **Defalcare-de-transparență shareable** în portal (post-plată) + „blocul tău vs media".
4. **Referral pe luni gratis** (înlocuiește XP) + pitch pentru firme de administrare.
5. **Landing care ARATĂ WOW** (video OCR + defalcare animată) în loc de numărători.

## Out of Scope (acum)
- Investiție suplimentară în gamification XP.
- Features noi de admin înainte ca bucla din §3 să fie construită + măsurată.
- Expansiune internațională (RO-first: SPV/e-Factura, limbaj, întreținere = context local).
