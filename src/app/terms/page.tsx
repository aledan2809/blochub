import Link from 'next/link'
import { Building2, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Termeni și Condiții - BlocHub',
  description: 'Termenii și condițiile de utilizare a platformei BlocHub',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Înapoi la pagina principală
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">BlocHub</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Termeni și Condiții</h1>
          <p className="text-gray-500 mt-2">Ultima actualizare: Ianuarie 2026</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl border p-8 prose prose-gray max-w-none">
          <h2>1. Definiții</h2>
          <ul>
            <li><strong>"Platforma"</strong> - aplicația web BlocHub</li>
            <li><strong>"Administrator"</strong> - persoana care gestionează o asociație de proprietari</li>
            <li><strong>"Proprietar"</strong> - locatarul cu cont în platformă</li>
            <li><strong>"Servicii"</strong> - funcționalitățile oferite de platformă</li>
          </ul>

          <h2>2. Acceptarea termenilor</h2>
          <p>
            Prin crearea unui cont sau utilizarea platformei, acceptați acești termeni în totalitate.
            Dacă nu sunteți de acord, nu utilizați serviciile noastre.
          </p>

          <h2>3. Descrierea serviciilor</h2>
          <p>BlocHub oferă:</p>
          <ul>
            <li>Gestionarea asociațiilor de proprietari</li>
            <li>Calculul și emiterea chitanțelor de întreținere</li>
            <li>Înregistrarea plăților și încasărilor</li>
            <li>Comunicare între administrator și proprietari</li>
            <li>Rapoarte și statistici</li>
            <li>Sistem de sesizări și tichete</li>
          </ul>

          <h2>4. Înregistrare și cont</h2>
          <ul>
            <li>Trebuie să furnizați informații corecte și complete</li>
            <li>Sunteți responsabil pentru securitatea contului</li>
            <li>Un cont este personal și nu poate fi partajat</li>
            <li>Administratorii sunt responsabili pentru datele introduse</li>
          </ul>

          <h2>5. Utilizare acceptabilă</h2>
          <p>Este interzis să:</p>
          <ul>
            <li>Introduceți date false sau înșelătoare</li>
            <li>Încercați să accesați conturi ale altor utilizatori</li>
            <li>Utilizați platforma pentru activități ilegale</li>
            <li>Încărcați conținut malițios sau viruși</li>
            <li>Copiați sau redistribuiți software-ul</li>
          </ul>

          <h2>6. Plăți și facturare</h2>
          <ul>
            <li>Plățile online sunt procesate securizat prin Stripe</li>
            <li>Nu stocăm datele cardului dvs.</li>
            <li>Prețurile includ TVA conform legislației</li>
            <li>Facturile sunt disponibile în cont</li>
          </ul>

          <h2>7. Limitarea răspunderii</h2>
          <p>
            BlocHub oferă serviciile "ca atare". Nu garantăm disponibilitate 100%
            sau lipsa erorilor. Nu suntem răspunzători pentru:
          </p>
          <ul>
            <li>Pierderi indirecte sau consecvențiale</li>
            <li>Date introduse incorect de utilizatori</li>
            <li>Întreruperi cauzate de furnizori terți</li>
            <li>Decizii luate bazate pe informațiile din platformă</li>
          </ul>
          <p>
            Răspunderea noastră maximă este limitată la sumele plătite în ultimele 12 luni.
          </p>

          <h2>8. Proprietate intelectuală</h2>
          <p>
            Toate drepturile asupra platformei, designului și codului aparțin BlocHub.
            Utilizatorii păstrează drepturile asupra datelor introduse.
          </p>

          <h2>9. Suspendare și reziliere</h2>
          <p>
            Ne rezervăm dreptul de a suspenda sau șterge conturi care:
          </p>
          <ul>
            <li>Încalcă acești termeni</li>
            <li>Sunt inactive mai mult de 12 luni</li>
            <li>Sunt folosite fraudulos</li>
          </ul>

          <h2>10. Modificări ale termenilor</h2>
          <p>
            Putem modifica acești termeni cu notificare prealabilă de 30 de zile.
            Continuarea utilizării după modificări constituie acceptare.
          </p>

          <h2>11. Legea aplicabilă</h2>
          <p>
            Acești termeni sunt guvernați de legea română.
            Disputele vor fi soluționate de instanțele competente din București.
          </p>

          <h2>12. Contact</h2>
          <p>
            Pentru întrebări despre acești termeni:
          </p>
          <ul>
            <li>Email: <a href="mailto:legal@blochub.ro">legal@blochub.ro</a></li>
            <li>Adresă: București, România</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
