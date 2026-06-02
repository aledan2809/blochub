# Manual de utilizare — BlocX (blocx.ro)

> Platformă de administrare a asociațiilor de proprietari: clădiri, apartamente, proprietari, cheltuieli → repartizare → chitanțe → încasări/plăți, fonduri, furnizori, tichete, avizier, portal locatari.
> **Scris din perspectiva unui utilizator complet nou.** Reflectă fluxul REAL din producție la 2026-06-02. Unde produsul nu se auto-explică, e marcat ⚠️ (vezi și `Reports/newuser-journey-2026-06-02/REPORT.md`).
>
> **Două roluri, două experiențe complet diferite:**
> - **ADMINISTRATOR** (cel care își face cont singur) — configurează asociația și o gestionează.
> - **PROPRIETAR / LOCATAR** (invitat de admin) — își vede situația și plătește online.

---

## PARTEA 1 — ADMINISTRATOR de asociație

### 1.1 Creează-ți contul
1. Intră pe **blocx.ro**.
2. Apasă **„Începe Gratuit"** (sus-dreapta sau în pagină) → ajungi la `/auth/register`.
3. Completează: **Nume complet**, **Email**, **Telefon** (opțional), **Parolă** (min. 8 caractere), **Confirmă parola**.
4. Bifează **termenii** → apasă butonul de înregistrare.
5. Ești dus la pagina de login. Intră cu emailul și parola.
   - *Nu e nevoie de confirmare pe email* — contul e activ imediat ca **ADMINISTRATOR**.

### 1.2 Primul ecran (onboarding)
La prima intrare vei vedea, posibil acoperit de o felicitare („Nivel nou! Începător") și un banner de cookie:
- închide felicitarea (clic oriunde) și acceptă/refuză cookie-urile.
- Vei rămâne pe **Dashboard** cu mesajul **„Bun venit în BlocX! Pentru a începe, adaugă prima ta clădire din meniul din stânga."**

⚠️ **De știut (G-BLOC-016/017):** butonul **„Adaugă prima clădire"** (stânga-sus în meniu) deschide de fapt formularul de creare a **ASOCIAȚIEI**, nu a unei clădiri. E primul pas obligatoriu.

### 1.3 Creează asociația
**Meniul din stânga (sus) → „Adaugă prima clădire" →** se deschide o fereastră:
1. **Numele Asociației** (ex: „Asociația Bloc A1")
2. **Adresa** (ex: „Str. Exemplu nr. 10")
3. **Oraș** + **Județ/Sector**
4. Salvează → asociația e creată și selectată automat.

⚠️ Până configurezi asociația, paginile de date (Cheltuieli, Încasări etc.) pot afișa un **cerc de încărcare care nu se termină** (G-BLOC-018) — e normal, întâi creează asociația.

### 1.4 Configurează clădirea, scările și apartamentele
**Meniu → „Clădire"** (`/dashboard/cladire`):
1. Adaugă clădirea (nume).
2. Adaugă **scările** (număr scară + număr de etaje).

**Meniu → „Apartamente"** (`/dashboard/apartamente`):
1. Adaugă apartamentele pe fiecare scară (număr apartament).
2. Pentru repartizare corectă, completează la fiecare apartament: **cota indiviză (%)**, **număr persoane**, **suprafață** — în funcție de metoda pe care o vei folosi (vezi 1.6).

### 1.5 Adaugă proprietarii și invită-i
**Meniu → „Proprietari"** (`/dashboard/proprietari`):
1. Adaugă datele de contact ale proprietarului.
2. Trimite-i **invitație** (pe email) legată de apartamentul lui → primește un link `/invite/<token>`.

⚠️ **IMPORTANT (G-BLOC-015):** la momentul scrierii, **linkul de invitație nu funcționează** pentru un proprietar care nu e logat — afișează „Invitație Invalidă". Este un bug de producție raportat (P1). Până la remediere, proprietarii **nu pot accepta invitația singuri**. (Detalii și fix propus în `AUDIT_GAPS.md` G-BLOC-015.)

### 1.6 Înregistrează cheltuielile și alege metoda de repartizare
**Meniu → „Cheltuieli"** (`/dashboard/cheltuieli`):
1. Apasă adaugă cheltuială.
2. Alege **tipul** (Apă rece/caldă, Gaz, Curent comun, Căldură, Gunoi, Administrare, Fond rulment/reparații, Alte cheltuieli etc.).
3. Introdu **suma**, **luna/anul**, **data facturii**, **furnizorul** (⚠️ obligatoriu — G-BLOC-025: trebuie să ai întâi un furnizor în „Furnizori").
4. Alege **modul de repartizare**:
   - **Pe cotă indiviză** — `sumă × cota_apartament / total_cote` (implicit)
   - **Pe persoane** — `sumă × persoane_apartament / total_persoane`
   - **Fix / apartament** — `sumă / număr_total_apartamente` (egal)
   - **Pe consum** — pe baza indexurilor de contoare (`preț_unitar = sumă / consum_total`)
   - **Manual** — introduci tu sumele

### 1.7 Generează chitanțele (repartizarea)
**Meniu → „Chitanțe" → Generează** (sau cronul lunar):
- Sistemul calculează pentru fiecare apartament: **întreținere** (suma cheltuielilor repartizate) + **fonduri** (rulment/reparații) + **restanțe** (neplătit din lunile trecute) + **penalizări** (pentru întârziere) = **total de plată**.
- Fiecare chitanță are o **defalcare pe linii** (ce cheltuială, ce sumă) stocată intern.

⚠️ **De știut (G-BLOC-024):** regenerarea pe aceeași lună poate crea o chitanță nouă în loc să o înlocuiască — verifică să nu rămână duplicate.

### 1.8 Încasări și plăți
- **Meniu → „Încasări"** (`/dashboard/incasari`) — înregistrezi banii primiți de la proprietari (cash/transfer/card); chitanța trece pe „plătită".
- **Meniu → „Plăți"** (`/dashboard/plati`) — plățile către furnizori.

### 1.9 Restul instrumentelor
- **Avizier** (`/dashboard/avizier`) — situația lunii afișată centralizat (vizibilă și de proprietari în portal).
- **Tichete** (`/dashboard/tichete`) — sesizările locatarilor.
- **Rapoarte** (`/dashboard/rapoarte`) — situații financiare.
- **Furnizori / Facturi (SPV e-Factura ANAF)** — gestiunea furnizorilor și a facturilor.
- **Setări** (`/dashboard/setari`) — date asociație, conturi bancare, serie chitanțier, zi scadență, penalizare/zi.
- **Audit** (`/dashboard/audit`) — jurnal de modificări.

---

## PARTEA 2 — PROPRIETAR / LOCATAR

### 2.1 Primește invitația și creează-ți contul
1. Administratorul te invită → primești pe email un link **`/invite/<token>`**.
2. Deschizi linkul → vezi asociația + apartamentul tău → completezi **nume**, **parolă** (min. 6 caractere), confirmi → **„Acceptă Invitația"**.
3. Te loghezi cu emailul și parola.

⚠️ **STARE ACTUALĂ (G-BLOC-015):** acest pas **este blocat în producție** — linkul afișează „Invitație Invalidă". Bug raportat (P1), de remediat înainte de a recomanda fluxul către proprietari reali.

### 2.2 Portalul tău (`/portal`)
După login, navighează la **`/portal`** (⚠️ G-BLOC-019: după login ești dus pe `/dashboard`; mergi manual la `/portal`). Acolo ai:
- **Plăți** (`/portal/payments`) — chitanțele tale + **„Plătește acum"** (card, prin Stripe).
- **Avizier** (`/portal/avizier`) — sumarul lunii: total întreținere/restanțe/penalizări/general + tabel pe apartamente.
- **Sesizări** (`/portal/sesizari`) — trimiți o sesizare administratorului.
- **Documente** (`/portal/documente`) — documentele asociației.
- **Chat / Asistent virtual** (`/portal/chat`) — asistent AI.

⚠️ **Contoare:** valorile de contoare afișate pe portal pot fi date demonstrative hardcodate (G-BLOC-021), nu citirea ta reală.

### 2.3 Plătește chitanța
**`/portal/payments` → „Plătește acum"** pe chitanța neplătită → plată cu cardul (Stripe).

---

## ⚠️ Cât de bine se „auto-explică" produsul (verdict onest)

- **Vezi *cât* ai de plătit** — da (total + restanțe + general, pe avizier/plăți).
- **Vezi *de ce* atât?** — **NU suficient (G-BLOC-020).** Defalcarea pe cheltuieli (ce cheltuială, ce metodă de repartizare, ce cotă) e calculată și stocată, dar **nu e afișată** proprietarului: portalul arată doar totalul, iar secțiunea „Defalcare pe Categorii" de pe avizier apare goală. Un locatar nou nu poate justifica singur suma.
- **Adminul nou** are nevoie de acest manual: onboarding-ul ghidat (4 pași) există în cod dar **nu e activ** (G-BLOC-016), iar primul buton e etichetat înșelător (G-BLOC-017).

**Recomandări de îmbunătățire a auto-explicabilității** (de prioritizat, prin propose-confirm-apply):
1. Reconectează `SetupWizard` (onboarding ghidat) — rezolvă cea mai mare parte din fricțiunea adminului.
2. Expune `detaliiJson` (defalcarea pe linii) în `/api/portal/chitante` + afișeaz-o pe `/portal/payments` și în „Defalcare pe Categorii" — astfel proprietarul vede *de ce* plătește.
3. Repară acceptarea invitației (G-BLOC-015) — altfel proprietarii nu intră deloc.

---

*Versiune 1.0 — 2026-06-02. Sursă: parcurgere reală pe blocx.ro (vezi `Reports/newuser-journey-2026-06-02/`). De actualizat când gap-urile G-BLOC-015..026 sunt remediate.*
