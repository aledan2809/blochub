import Link from 'next/link'

export const metadata = {
  title: 'Politica de Confidențialitate — BlocHub',
  description: 'Politica de confidențialitate și protecția datelor personale BlocHub',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">← Inapoi</Link>
          <span className="text-xs text-slate-400">Actualizat: 26 Februarie 2026</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 space-y-8">
        <h1 className="text-3xl font-bold">Politica de Confidentialitate</h1>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Introducere</h2>
          <p className="text-slate-600 leading-relaxed">
            BlocHub (&ldquo;noi&rdquo;, &ldquo;platforma&rdquo;), operat de TechBiz Hub L.L.C-FZ, respecta
            confidentialitatea utilizatorilor sai. Aceasta politica descrie modul in care colectam, utilizam
            si protejam datele dumneavoastra personale in conformitate cu Regulamentul General privind
            Protectia Datelor (GDPR) si legislatia romana in vigoare.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Operator de date</h2>
          <p className="text-slate-600 leading-relaxed">
            Operatorul de date personale este TechBiz Hub L.L.C-FZ. Pentru orice intrebari legate
            de prelucrarea datelor personale, ne puteti contacta la:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-1">
            <li>Email: <a href="mailto:gdpr@4pro.io" className="text-blue-600 hover:underline">gdpr@4pro.io</a></li>
            <li>Email suport: <a href="mailto:support@4pro.io" className="text-blue-600 hover:underline">support@4pro.io</a></li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Date colectate</h2>
          <p className="text-slate-600 leading-relaxed">Colectam urmatoarele categorii de date:</p>
          <ul className="list-disc pl-6 text-slate-600 space-y-1">
            <li><strong>Date de identificare:</strong> nume, prenume, adresa email, numar de telefon</li>
            <li><strong>Date despre proprietate:</strong> numar apartament, suprafata, cota indiviza, bloc, scara</li>
            <li><strong>Date financiare:</strong> istoricul platilor de intretinere, restante (nu stocam date de card)</li>
            <li><strong>Date de consum:</strong> indexuri contoare, istoric consum utilitati</li>
            <li><strong>Date tehnice:</strong> adresa IP, tip browser, sistem de operare, date de logare</li>
            <li><strong>Date despre locuinta:</strong> informatii despre apartament, numar camere, proprietar/chirias</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Scopul prelucrarii</h2>
          <p className="text-slate-600 leading-relaxed">Datele sunt utilizate pentru:</p>
          <ul className="list-disc pl-6 text-slate-600 space-y-1">
            <li>Gestionarea asociatiei de proprietari si a blocurilor</li>
            <li>Calculul si emiterea chitantelor de intretinere</li>
            <li>Procesarea platilor online si reconcilierea financiara</li>
            <li>Trimiterea notificarilor despre scadente, plati si anunturi</li>
            <li>Generarea rapoartelor financiare si statisticilor</li>
            <li>Gestionarea sesizarilor si tichetelor de mentenanta</li>
            <li>Imbunatatirea serviciilor prin analiza agregata</li>
            <li>Suport tehnic si comunicare</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Temeiuri legale</h2>
          <p className="text-slate-600 leading-relaxed">Prelucram datele in baza:</p>
          <ul className="list-disc pl-6 text-slate-600 space-y-1">
            <li><strong>Executarea contractului</strong> — administrarea asociatiei de proprietari</li>
            <li><strong>Obligatii legale</strong> — Legea 196/2018 privind asociatiile de proprietari, legislatia fiscala</li>
            <li><strong>Interes legitim</strong> — imbunatatirea serviciilor, securitatea platformei</li>
            <li><strong>Consimtamant</strong> — pentru comunicari de marketing si notificari optionale</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Partajarea datelor</h2>
          <p className="text-slate-600 leading-relaxed">Datele pot fi partajate cu:</p>
          <ul className="list-disc pl-6 text-slate-600 space-y-1">
            <li>Administratorul asociatiei (pentru gestionarea blocului)</li>
            <li>Furnizorii de utilitati (pentru reconcilierea consumului)</li>
            <li>Procesatori de plati (Stripe — conform standardelor PCI DSS)</li>
            <li>Furnizori de servicii cloud (servere in UE)</li>
          </ul>
          <p className="text-slate-600 leading-relaxed">
            <strong>Nu vindem si nu cedam datele personale catre terti.</strong>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Stocarea datelor</h2>
          <p className="text-slate-600 leading-relaxed">
            Datele sunt stocate pe servere situate in Uniunea Europeana. Implementam masuri tehnice
            si organizatorice adecvate pentru protejarea datelor, inclusiv:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-1">
            <li>Criptare in tranzit (HTTPS/TLS)</li>
            <li>Criptare la stocare pentru date sensibile</li>
            <li>Autentificare securizata cu hashing parole</li>
            <li>Backup-uri regulate si criptate</li>
            <li>Acces restrictionat bazat pe roluri (administrator, proprietar)</li>
            <li>Audit trail pentru modificari</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Durata pastrarii</h2>
          <p className="text-slate-600 leading-relaxed">
            Pastram datele pe durata relatiei contractuale si conform obligatiilor legale:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-1">
            <li>Documente financiar-contabile: 10 ani (conform legislatiei fiscale)</li>
            <li>Date de cont: pe durata existentei contului + 30 zile dupa stergere</li>
            <li>Log-uri tehnice: maximum 12 luni</li>
            <li>Date de marketing: pana la retragerea consimtamantului</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Drepturile dumneavoastra</h2>
          <p className="text-slate-600 leading-relaxed">Conform GDPR, aveti dreptul la:</p>
          <ul className="list-disc pl-6 text-slate-600 space-y-1">
            <li><strong>Acces</strong> — sa solicitati o copie a datelor personale</li>
            <li><strong>Rectificare</strong> — sa corectati datele inexacte</li>
            <li><strong>Stergere</strong> — sa solicitati stergerea datelor (cu exceptii legale)</li>
            <li><strong>Restrictionare</strong> — sa limitati prelucrarea in anumite situatii</li>
            <li><strong>Portabilitate</strong> — sa primiti datele in format electronic structurat</li>
            <li><strong>Opozitie</strong> — sa va opuneti prelucrarii bazate pe interes legitim</li>
            <li><strong>Retragerea consimtamantului</strong> — oricand, fara a afecta legalitatea prelucrarii anterioare</li>
          </ul>
          <p className="text-slate-600 leading-relaxed">
            Pentru exercitarea drepturilor, contactati-ne la{' '}
            <a href="mailto:gdpr@4pro.io" className="text-blue-600 hover:underline">gdpr@4pro.io</a>.
            Vom raspunde in maximum 30 de zile.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">10. Cookies</h2>
          <p className="text-slate-600 leading-relaxed">
            Utilizam cookies esentiale pentru functionarea aplicatiei (autentificare, preferinte sesiune).
            Nu utilizam cookies de tracking sau publicitate. Cookies analitice sunt anonimizate.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">11. Plangeri</h2>
          <p className="text-slate-600 leading-relaxed">
            Daca considerati ca prelucrarea datelor incalca drepturile dumneavoastra, aveti dreptul
            sa depuneti o plangere la Autoritatea Nationala de Supraveghere a Prelucrarii Datelor
            cu Caracter Personal (ANSPDCP) — <a href="https://www.dataprotection.ro" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">www.dataprotection.ro</a>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">12. Modificari</h2>
          <p className="text-slate-600 leading-relaxed">
            Ne rezervam dreptul de a actualiza aceasta politica. Modificarile semnificative vor fi
            comunicate prin email sau notificare in aplicatie cu minimum 30 de zile inainte de
            intrarea in vigoare.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">13. Contact</h2>
          <p className="text-slate-600 leading-relaxed">
            Pentru orice intrebari legate de aceasta politica de confidentialitate:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-1">
            <li>Email protectia datelor: <a href="mailto:gdpr@4pro.io" className="text-blue-600 hover:underline">gdpr@4pro.io</a></li>
            <li>Email suport: <a href="mailto:support@4pro.io" className="text-blue-600 hover:underline">support@4pro.io</a></li>
          </ul>
        </section>

        <footer className="border-t pt-8 mt-12 flex gap-6 text-sm text-slate-400">
          <Link href="/privacy" className="hover:text-slate-600 font-medium text-slate-600">Confidentialitate</Link>
          <Link href="/terms" className="hover:text-slate-600">Termeni</Link>
          <Link href="/gdpr" className="hover:text-slate-600">GDPR</Link>
        </footer>
      </main>
    </div>
  )
}
