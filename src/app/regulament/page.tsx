import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Regulament — Roata administratorilor BlocX",
  description: "Regulamentul oficial al campaniei promoționale „Roata administratorilor” (luni gratuite BlocX).",
};

// Date organizator — Class RDA Impex S.R.L. este controller BlocHub în Legal hub
// (slug `class-rda`). Sursa de adevăr a acestor valori e Legal hub; dacă se schimbă
// (mutare sediu, schimbare nr. reg. com.), update în Legal mai întâi, apoi sincronizare aici.
const ORG = {
  name: "Class RDA Impex S.R.L.",
  cui: "29867320",
  reg: "J40/2439/2012",
  sediu: "Str. Pridvorului nr. 5, bl. 6, ap. 1, Sector 4, București, România",
  email: "contact@blocx.ro",
};

export default function RegulamentPage() {
  return (
    <div className="min-h-screen bg-white text-gray-800">
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">BlocX</Link>
          <Link href="/roata" className="text-sm text-gray-500 hover:text-gray-900">← Roata</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-12 prose-sm">
        <h1 className="text-3xl font-bold text-gray-900">Regulamentul campaniei „Roata administratorilor”</h1>
        <p className="mt-2 text-sm text-gray-500">Loterie publicitară conform O.G. nr. 99/2000. Ultima actualizare: 2026-05-27.</p>

        <section className="mt-8 space-y-6 text-sm leading-relaxed text-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">1. Organizatorul</h2>
            <p>Campania este organizată de <b>{ORG.name}</b> (CUI {ORG.cui}, nr. reg. com. {ORG.reg}, sediul în {ORG.sediu}), care operează platforma BlocX. Contact: {ORG.email}.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900">2. Perioada și aria de desfășurare</h2>
            <p>Campania se desfășoară online, pe <b>blocx.ro/roata</b>, pe o perioadă de <b>7 zile</b> de la data lansării (afișată în cronometrul de pe pagină). Organizatorul poate prelungi sau încheia campania anunțând pe pagină.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900">3. Dreptul de participare</h2>
            <p>Pot participa persoanele majore care administrează o asociație de proprietari / un bloc din România. Participarea este <b>gratuită</b> și nu este condiționată de vreo achiziție.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900">4. Mecanismul campaniei</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Participantul învârte „roata” (valori de la 1 la 12), care indică un număr de luni gratuite de utilizare BlocX.</li>
              <li>Sunt permise <b>5 învârtiri pe zi</b>, cu o pauză de <b>1 minut</b> între ele.</li>
              <li>Participantul <b>păstrează cel mai bun rezultat al zilei</b> (maximum 12 luni). Dacă nu este mulțumit, poate reveni în ziua următoare, în limita perioadei campaniei.</li>
              <li>Rezultatele sunt generate de server, în mod aleatoriu; reprezentarea grafică a roții este doar vizuală.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900">5. Premiile</h2>
            <p>Premiile constau în <b>luni de utilizare gratuită</b> a platformei BlocX (între 1 și 12 luni), conform rezultatului ales. Premiul de <b>12 luni</b> este limitat la primele <b>20 de conturi</b>; după epuizare, valoarea maximă disponibilă scade. Premiile nu pot fi preschimbate în bani.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900">6. Revendicarea și acordarea premiului</h2>
            <p>Pentru a bloca rezultatul, participantul completează un formular (nume, asociație/bloc, email, telefon, oraș). Un participant poate revendica <b>un singur</b> rezultat, asociat adresei sale de email. Premiul se activează după ce Organizatorul contactează participantul și creează contul BlocX.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900">7. Prelucrarea datelor cu caracter personal</h2>
            <p>Datele furnizate sunt prelucrate de Organizator exclusiv pentru derularea campaniei și activarea contului, conform GDPR (Reg. UE 2016/679). Participantul își poate exercita drepturile (acces, rectificare, ștergere) scriind la {ORG.email}.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900">8. Taxe și impozite</h2>
            <p>Premiile fiind reduceri/luni gratuite acordate în cadrul unei loterii publicitare, nu implică obligații fiscale pentru participanți peste pragurile legale aplicabile.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900">9. Litigii și forță majoră</h2>
            <p>Eventualele litigii se rezolvă pe cale amiabilă sau de către instanțele competente din România. Organizatorul nu răspunde pentru situații de forță majoră care împiedică desfășurarea campaniei.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900">10. Regulamentul</h2>
            <p>Regulamentul este disponibil gratuit pe această pagină pe toată durata campaniei. Prin participare, participantul declară că a citit și acceptă acest regulament.</p>
          </div>
        </section>

        <div className="mt-10">
          <Link href="/roata" className="text-blue-600 hover:underline">← Înapoi la roată</Link>
        </div>
      </main>
    </div>
  );
}
