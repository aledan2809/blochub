import Link from 'next/link'
import { Building2, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Politica de Confidențialitate - BlocHub',
  description: 'Politica de confidențialitate și protecția datelor personale BlocHub',
}

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-bold text-gray-900">Politica de Confidențialitate</h1>
          <p className="text-gray-500 mt-2">Ultima actualizare: Ianuarie 2026</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl border p-8 prose prose-gray max-w-none">
          <h2>1. Introducere</h2>
          <p>
            BlocHub ("noi", "al nostru") respectă confidențialitatea utilizatorilor săi.
            Această politică descrie modul în care colectăm, utilizăm și protejăm datele dumneavoastră personale
            în conformitate cu Regulamentul General privind Protecția Datelor (GDPR).
          </p>

          <h2>2. Date colectate</h2>
          <p>Colectăm următoarele categorii de date:</p>
          <ul>
            <li><strong>Date de identificare:</strong> nume, prenume, adresă email, număr de telefon</li>
            <li><strong>Date despre proprietate:</strong> număr apartament, suprafață, cotă indiviză</li>
            <li><strong>Date financiare:</strong> istoricul plăților, restanțe (nu stocăm date de card)</li>
            <li><strong>Date de consum:</strong> indexuri contoare, istoric consum</li>
            <li><strong>Date tehnice:</strong> adresă IP, tip browser, date de logare</li>
          </ul>

          <h2>3. Scopul prelucrării</h2>
          <p>Datele sunt utilizate pentru:</p>
          <ul>
            <li>Gestionarea asociației de proprietari</li>
            <li>Calculul și emiterea chitanțelor de întreținere</li>
            <li>Procesarea plăților</li>
            <li>Trimiterea notificărilor despre scadențe și plăți</li>
            <li>Îmbunătățirea serviciilor prin analiză agregată</li>
            <li>Suport tehnic și comunicare</li>
          </ul>

          <h2>4. Temeiuri legale</h2>
          <p>Prelucrăm datele în baza:</p>
          <ul>
            <li>Executării contractului de administrare</li>
            <li>Obligațiilor legale (Legea 196/2018 privind asociațiile de proprietari)</li>
            <li>Interesului legitim pentru îmbunătățirea serviciilor</li>
            <li>Consimțământului (pentru comunicări de marketing)</li>
          </ul>

          <h2>5. Partajarea datelor</h2>
          <p>Datele pot fi partajate cu:</p>
          <ul>
            <li>Administratorul asociației (pentru gestionare)</li>
            <li>Furnizorii de utilități (pentru reconcilierea consumului)</li>
            <li>Procesatori de plăți (Stripe - conform standardelor PCI DSS)</li>
            <li>Furnizori de servicii cloud (Vercel, Supabase - date criptate)</li>
          </ul>
          <p>Nu vindem datele personale către terți.</p>

          <h2>6. Securitatea datelor</h2>
          <p>Implementăm măsuri de securitate:</p>
          <ul>
            <li>Criptare în tranzit (HTTPS/TLS)</li>
            <li>Criptare la stocare pentru date sensibile</li>
            <li>Autentificare securizată</li>
            <li>Backup-uri regulate</li>
            <li>Acces restricționat bazat pe roluri</li>
          </ul>

          <h2>7. Drepturile dumneavoastră</h2>
          <p>Conform GDPR, aveți dreptul la:</p>
          <ul>
            <li><strong>Acces:</strong> Să solicitați o copie a datelor</li>
            <li><strong>Rectificare:</strong> Să corectați datele inexacte</li>
            <li><strong>Ștergere:</strong> Să solicitați ștergerea datelor (cu excepții legale)</li>
            <li><strong>Portabilitate:</strong> Să primiți datele în format electronic</li>
            <li><strong>Opoziție:</strong> Să vă opuneți prelucrării în anumite situații</li>
            <li><strong>Retragerea consimțământului:</strong> Oricând, pentru prelucrările bazate pe consimțământ</li>
          </ul>

          <h2>8. Retenția datelor</h2>
          <p>
            Păstrăm datele pe durata relației contractuale și conform obligațiilor legale
            (10 ani pentru documente financiar-contabile).
          </p>

          <h2>9. Cookies</h2>
          <p>
            Utilizăm cookies esențiale pentru funcționarea aplicației și cookies analitice
            (anonimizate) pentru îmbunătățirea experienței.
          </p>

          <h2>10. Contact</h2>
          <p>
            Pentru exercitarea drepturilor sau întrebări despre datele personale:
          </p>
          <ul>
            <li>Email: <a href="mailto:privacy@blochub.ro">privacy@blochub.ro</a></li>
            <li>Adresă: București, România</li>
          </ul>
          <p>
            Aveți dreptul să depuneți o plângere la ANSPDCP (Autoritatea Națională de Supraveghere
            a Prelucrării Datelor cu Caracter Personal).
          </p>
        </div>
      </div>
    </div>
  )
}
