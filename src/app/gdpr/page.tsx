import Link from 'next/link'

export const metadata = {
  title: 'Politica GDPR — BlocHub',
  description: 'Conformitatea cu Regulamentul General privind Protectia Datelor (GDPR) — BlocHub',
}

export default function GDPRPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">← Inapoi</Link>
          <span className="text-xs text-slate-400">Actualizat: 26 Februarie 2026</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 space-y-8">
        <h1 className="text-3xl font-bold">Politica GDPR</h1>
        <p className="text-slate-600 leading-relaxed">
          Acest document descrie modul in care BlocHub, operat de TechBiz Hub L.L.C-FZ, asigura
          conformitatea cu Regulamentul (UE) 2016/679 privind protectia persoanelor fizice in ceea
          ce priveste prelucrarea datelor cu caracter personal (GDPR).
        </p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Angajamentul nostru</h2>
          <p className="text-slate-600 leading-relaxed">
            Ne angajam sa protejam datele personale ale tuturor utilizatorilor platformei — administratori
            de asociatii, proprietari si rezidenti. Prelucram date personale doar in scopuri legitime,
            cu transparenta si in conformitate cu principiile GDPR.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Principiile GDPR pe care le respectam</h2>
          <ul className="list-disc pl-6 text-slate-600 space-y-2">
            <li><strong>Legalitate, echitate, transparenta</strong> — prelucram date doar pe baza unui temei legal valid si informam utilizatorii despre prelucrare</li>
            <li><strong>Limitarea scopului</strong> — colectam date doar pentru scopuri specifice, explicite si legitime</li>
            <li><strong>Minimizarea datelor</strong> — colectam doar datele strict necesare pentru functionarea serviciului</li>
            <li><strong>Exactitate</strong> — mentinem datele actualizate si corecte</li>
            <li><strong>Limitarea stocarii</strong> — pastram datele doar pe durata necesara scopului prelucrarii</li>
            <li><strong>Integritate si confidentialitate</strong> — implementam masuri tehnice si organizatorice adecvate</li>
            <li><strong>Responsabilitate</strong> — documentam si demonstram conformitatea cu GDPR</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Temeiurile legale ale prelucrarii</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-600 border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-semibold">Activitate</th>
                  <th className="text-left py-2 font-semibold">Temei legal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr><td className="py-2 pr-4">Gestionarea contului</td><td className="py-2">Executarea contractului</td></tr>
                <tr><td className="py-2 pr-4">Calculul intretinerii</td><td className="py-2">Executarea contractului + Obligatie legala</td></tr>
                <tr><td className="py-2 pr-4">Procesarea platilor</td><td className="py-2">Executarea contractului</td></tr>
                <tr><td className="py-2 pr-4">Documente financiare</td><td className="py-2">Obligatie legala (Legea 196/2018, Cod fiscal)</td></tr>
                <tr><td className="py-2 pr-4">Notificari de scadenta</td><td className="py-2">Interes legitim</td></tr>
                <tr><td className="py-2 pr-4">Comunicari marketing</td><td className="py-2">Consimtamant</td></tr>
                <tr><td className="py-2 pr-4">Analiza si statistici</td><td className="py-2">Interes legitim (date anonimizate)</td></tr>
                <tr><td className="py-2 pr-4">Securitatea platformei</td><td className="py-2">Interes legitim</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Drepturile persoanelor vizate</h2>
          <p className="text-slate-600 leading-relaxed">
            In conformitate cu GDPR (articolele 15-22), aveti urmatoarele drepturi:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-2">
            <li><strong>Dreptul de acces (Art. 15)</strong> — puteti solicita confirmarea ca datele dvs. sunt prelucrate si o copie a acestora</li>
            <li><strong>Dreptul la rectificare (Art. 16)</strong> — puteti solicita corectarea datelor inexacte sau completarea celor incomplete</li>
            <li><strong>Dreptul la stergere (Art. 17)</strong> — puteti solicita stergerea datelor cand nu mai exista un motiv legal de pastrare</li>
            <li><strong>Dreptul la restrictionarea prelucrarii (Art. 18)</strong> — puteti solicita limitarea prelucrarii in anumite situatii</li>
            <li><strong>Dreptul la portabilitatea datelor (Art. 20)</strong> — puteti primi datele intr-un format structurat, utilizat frecvent si care poate fi citit automat</li>
            <li><strong>Dreptul la opozitie (Art. 21)</strong> — va puteti opune prelucrarii bazate pe interes legitim</li>
            <li><strong>Dreptul de a nu fi supus unei decizii automate (Art. 22)</strong> — nu luam decizii exclusiv automate cu efect legal semnificativ</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Exercitarea drepturilor</h2>
          <p className="text-slate-600 leading-relaxed">
            Pentru exercitarea oricarui drept, trimiteti un email la{' '}
            <a href="mailto:gdpr@4pro.io" className="text-blue-600 hover:underline">gdpr@4pro.io</a>{' '}
            cu subiectul &ldquo;Exercitare drepturi GDPR&rdquo;. Va rugam sa includeti:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-1">
            <li>Numele complet si adresa de email asociata contului</li>
            <li>Dreptul pe care doriti sa il exercitati</li>
            <li>O descriere clara a cererii</li>
          </ul>
          <p className="text-slate-600 leading-relaxed">
            Vom raspunde in termen de <strong>30 de zile calendaristice</strong>. In cazuri complexe,
            termenul poate fi prelungit cu inca 60 de zile, cu notificare prealabila.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Masuri de securitate</h2>
          <p className="text-slate-600 leading-relaxed">
            Implementam urmatoarele masuri tehnice si organizatorice:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-1">
            <li>Criptare end-to-end pentru date in tranzit (TLS 1.2+)</li>
            <li>Criptare la stocare (AES-256) pentru date sensibile</li>
            <li>Hashing parole cu algoritmi moderni (bcrypt)</li>
            <li>Autentificare multi-factor disponibila</li>
            <li>Control acces bazat pe roluri (RBAC)</li>
            <li>Audit trail complet pentru toate modificarile</li>
            <li>Backup-uri zilnice criptate</li>
            <li>Monitorizare continua a securitatii</li>
            <li>Servere in Uniunea Europeana</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Transferuri internationale</h2>
          <p className="text-slate-600 leading-relaxed">
            Datele personale sunt stocate si prelucrate exclusiv pe servere din Uniunea Europeana.
            Nu transferam date in afara Spatiului Economic European (SEE) fara garantii adecvate
            (clauze contractuale standard sau decizii de adecvare).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Incidente de securitate</h2>
          <p className="text-slate-600 leading-relaxed">
            In cazul unei incalcari a securitatii datelor, vom:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-1">
            <li>Notifica ANSPDCP in termen de 72 de ore de la luarea la cunostinta</li>
            <li>Notifica persoanele afectate fara intarzieri nejustificate daca exista risc ridicat</li>
            <li>Documenta incidentul si masurile luate</li>
            <li>Implementa masuri corective pentru prevenirea recurentei</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Responsabilul cu protectia datelor (DPO)</h2>
          <p className="text-slate-600 leading-relaxed">
            Pentru orice intrebari legate de prelucrarea datelor personale sau exercitarea
            drepturilor GDPR, contactati:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-1">
            <li>Email: <a href="mailto:gdpr@4pro.io" className="text-blue-600 hover:underline">gdpr@4pro.io</a></li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">10. Autoritatea de supraveghere</h2>
          <p className="text-slate-600 leading-relaxed">
            Autoritatea competenta pentru protectia datelor este Autoritatea Nationala de Supraveghere
            a Prelucrarii Datelor cu Caracter Personal (ANSPDCP):
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-1">
            <li>Website: <a href="https://www.dataprotection.ro" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">www.dataprotection.ro</a></li>
            <li>Adresa: B-dul G-ral. Gheorghe Magheru 28-30, Sector 1, Bucuresti</li>
          </ul>
        </section>

        <footer className="border-t pt-8 mt-12 flex gap-6 text-sm text-slate-400">
          <Link href="/privacy" className="hover:text-slate-600">Confidentialitate</Link>
          <Link href="/terms" className="hover:text-slate-600">Termeni</Link>
          <Link href="/gdpr" className="hover:text-slate-600 font-medium text-slate-600">GDPR</Link>
        </footer>
      </main>
    </div>
  )
}
