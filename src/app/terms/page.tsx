import Link from 'next/link'

export const metadata = {
  title: 'Termeni si Conditii — BlocHub',
  description: 'Termenii si conditiile de utilizare a platformei BlocHub',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">← Inapoi</Link>
          <span className="text-xs text-slate-400">Actualizat: 26 Februarie 2026</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 space-y-8">
        <h1 className="text-3xl font-bold">Termeni si Conditii</h1>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Definitii</h2>
          <ul className="list-disc pl-6 text-slate-600 space-y-1">
            <li><strong>&ldquo;Platforma&rdquo;</strong> — aplicatia web BlocHub, operata de TechBiz Hub L.L.C-FZ</li>
            <li><strong>&ldquo;Administrator&rdquo;</strong> — persoana care gestioneaza o asociatie de proprietari in platforma</li>
            <li><strong>&ldquo;Proprietar/Rezident&rdquo;</strong> — locatarul cu cont in platforma</li>
            <li><strong>&ldquo;Servicii&rdquo;</strong> — functionalitatile oferite de platforma</li>
            <li><strong>&ldquo;Utilizator&rdquo;</strong> — orice persoana care acceseaza sau utilizeaza platforma</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Acceptarea termenilor</h2>
          <p className="text-slate-600 leading-relaxed">
            Prin crearea unui cont sau utilizarea platformei, acceptati acesti termeni in totalitate.
            Daca nu sunteti de acord cu oricare dintre prevederi, va rugam sa nu utilizati serviciile noastre.
            Continuarea utilizarii dupa modificarea termenilor constituie acceptare.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Descrierea serviciilor</h2>
          <p className="text-slate-600 leading-relaxed">BlocHub ofera:</p>
          <ul className="list-disc pl-6 text-slate-600 space-y-1">
            <li>Gestionarea asociatiilor de proprietari si a blocurilor</li>
            <li>Calculul si emiterea chitantelor de intretinere</li>
            <li>Inregistrarea platilor si incasarilor</li>
            <li>Comunicare intre administrator si proprietari (anunturi, sesizari)</li>
            <li>Rapoarte financiare si statistici</li>
            <li>Sistem de sesizari si tichete de mentenanta</li>
            <li>Portal dedicat pentru proprietari/rezidenti</li>
            <li>Plati online securizate</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Inregistrare si cont</h2>
          <ul className="list-disc pl-6 text-slate-600 space-y-1">
            <li>Trebuie sa furnizati informatii corecte si complete la inregistrare</li>
            <li>Sunteti responsabil pentru securitatea contului si a parolei</li>
            <li>Un cont este personal si nu poate fi partajat</li>
            <li>Administratorii sunt responsabili pentru datele introduse despre proprietari</li>
            <li>Trebuie sa aveti cel putin 18 ani pentru a crea un cont</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Utilizare acceptabila</h2>
          <p className="text-slate-600 leading-relaxed">Este interzis sa:</p>
          <ul className="list-disc pl-6 text-slate-600 space-y-1">
            <li>Introduceti date false sau inselatoare</li>
            <li>Incercati sa accesati conturi ale altor utilizatori</li>
            <li>Utilizati platforma pentru activitati ilegale</li>
            <li>Incarcati continut malitios sau virusi</li>
            <li>Copiati sau redistribuiti software-ul platformei</li>
            <li>Utilizati instrumente automate (boti, scrapere) fara acord scris</li>
            <li>Incercati sa exploatati vulnerabilitati ale platformei</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Plati si facturare</h2>
          <ul className="list-disc pl-6 text-slate-600 space-y-1">
            <li>Platile online sunt procesate securizat prin procesatori certificati PCI DSS</li>
            <li>Nu stocam datele cardului dumneavoastra pe serverele noastre</li>
            <li>Preturile includ TVA conform legislatiei in vigoare</li>
            <li>Facturile sunt disponibile in contul dumneavoastra</li>
            <li>Rambursarile sunt procesate conform politicii de rambursare</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Disponibilitate si intreruperi</h2>
          <p className="text-slate-600 leading-relaxed">
            Depunem eforturi pentru a asigura disponibilitatea continua a platformei, dar nu garantam
            functionare 100% neintrerupta. Mentenanta planificata va fi anuntata cu minimum 24 de ore
            in avans. Nu suntem responsabili pentru indisponibilitatea cauzata de factori externi
            (furnizori de internet, atacuri cibernetice, forta majora).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Limitarea raspunderii</h2>
          <p className="text-slate-600 leading-relaxed">
            BlocHub ofera serviciile &ldquo;ca atare&rdquo; (as is). Nu garantam lipsa erorilor.
            Nu suntem raspunzatori pentru:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-1">
            <li>Pierderi indirecte sau consecventiale</li>
            <li>Date introduse incorect de utilizatori</li>
            <li>Intreruperi cauzate de furnizori terti</li>
            <li>Decizii luate bazate pe informatiile din platforma</li>
            <li>Pierderi financiare rezultate din erori de calcul datorate datelor incorecte</li>
          </ul>
          <p className="text-slate-600 leading-relaxed">
            Raspunderea noastra maxima este limitata la sumele platite de utilizator in ultimele 12 luni.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Proprietate intelectuala</h2>
          <p className="text-slate-600 leading-relaxed">
            Toate drepturile asupra platformei, designului, codului sursa, marcilor si continutului
            original apartin TechBiz Hub L.L.C-FZ. Utilizatorii pastreaza drepturile asupra datelor
            introduse. Prin utilizarea platformei, nu vi se acorda nicio licenta asupra proprietatii
            intelectuale, cu exceptia dreptului limitat de a utiliza serviciile conform acestor termeni.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">10. Suspendare si reziliere</h2>
          <p className="text-slate-600 leading-relaxed">
            Ne rezervam dreptul de a suspenda sau sterge conturi care:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-1">
            <li>Incalca acesti termeni sau legislatia in vigoare</li>
            <li>Sunt inactive mai mult de 12 luni</li>
            <li>Sunt folosite fraudulos sau abuziv</li>
          </ul>
          <p className="text-slate-600 leading-relaxed">
            La stergerea contului, datele vor fi tratate conform Politicii de Confidentialitate.
            Puteti solicita exportul datelor inainte de stergere.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">11. Modificari ale termenilor</h2>
          <p className="text-slate-600 leading-relaxed">
            Putem modifica acesti termeni cu notificare prealabila de minimum 30 de zile prin email
            sau notificare in aplicatie. Continuarea utilizarii dupa intrarea in vigoare a modificarilor
            constituie acceptare.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">12. Legea aplicabila</h2>
          <p className="text-slate-600 leading-relaxed">
            Acesti termeni sunt guvernati de legislatia din Romania. Disputele vor fi solutionate
            pe cale amiabila sau, in caz contrar, de instantele competente din Bucuresti, Romania.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">13. Contact</h2>
          <p className="text-slate-600 leading-relaxed">
            Pentru intrebari despre acesti termeni:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-1">
            <li>Email: <a href="mailto:support@4pro.io" className="text-blue-600 hover:underline">support@4pro.io</a></li>
          </ul>
        </section>

        <footer className="border-t pt-8 mt-12 flex gap-6 text-sm text-slate-400">
          <Link href="/privacy" className="hover:text-slate-600">Confidentialitate</Link>
          <Link href="/terms" className="hover:text-slate-600 font-medium text-slate-600">Termeni</Link>
          <Link href="/gdpr" className="hover:text-slate-600">GDPR</Link>
        </footer>
      </main>
    </div>
  )
}
