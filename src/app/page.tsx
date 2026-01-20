import Link from 'next/link'
import { Building2, Zap, Brain, Shield, CreditCard, BarChart3 } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">BlocHub</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/auth/login" className="text-gray-600 hover:text-gray-900">
                Autentificare
              </Link>
              <Link
                href="/auth/register"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Începe Gratuit
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Administrare Blocuri
            <span className="text-blue-600"> Inteligentă</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Platformă 95% automatizată cu AI. Generează chitanțe în 30 secunde,
            nu în 30 minute. Fără angajați, fără bătăi de cap.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/auth/register"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Începe Gratuit - 0 lei
            </Link>
            <Link
              href="#demo"
              className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Vezi Demo
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Gratuit pentru max 20 apartamente. Fără card necesar.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-blue-600 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <div className="text-4xl font-bold">95%</div>
              <div className="text-blue-100">Automatizare AI</div>
            </div>
            <div>
              <div className="text-4xl font-bold">15 min</div>
              <div className="text-blue-100">Setup Complet</div>
            </div>
            <div>
              <div className="text-4xl font-bold">30 sec</div>
              <div className="text-blue-100">Generare Chitanțe</div>
            </div>
            <div>
              <div className="text-4xl font-bold">0 lei</div>
              <div className="text-blue-100">Pentru Început</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Tot ce ai nevoie, automatizat cu AI
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Brain className="h-10 w-10 text-blue-600" />}
            title="AI Agents"
            description="OCR pentru facturi și indexuri, predictie restanțe, chatbot 24/7 pentru proprietari"
          />
          <FeatureCard
            icon={<Zap className="h-10 w-10 text-blue-600" />}
            title="Automatizare 95%"
            description="Chitanțe generate automat, plăți reconciliate instant, remindere trimise automat"
          />
          <FeatureCard
            icon={<CreditCard className="h-10 w-10 text-blue-600" />}
            title="Plăți Online"
            description="Card, Apple Pay, Google Pay. Reconciliere automată via Open Banking"
          />
          <FeatureCard
            icon={<Shield className="h-10 w-10 text-blue-600" />}
            title="Securitate GDPR"
            description="Date criptate, backup automat, audit trail complet pentru fiecare modificare"
          />
          <FeatureCard
            icon={<BarChart3 className="h-10 w-10 text-blue-600" />}
            title="Dashboard Inteligent"
            description="Vizualizări real-time, alerte proactive, rapoarte automate"
          />
          <FeatureCard
            icon={<Building2 className="h-10 w-10 text-blue-600" />}
            title="Portal Proprietari"
            description="Transparență totală: chitanțe, plăți, documente, anunțuri - toate într-un loc"
          />
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Prețuri Simple și Transparente
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              title="Free"
              price="0"
              description="Pentru blocuri mici"
              features={[
                'Max 20 apartamente',
                'Chitanțe & plăți basic',
                'Portal proprietari',
                'Email support',
              ]}
              cta="Începe Gratuit"
              ctaHref="/auth/register"
            />
            <PricingCard
              title="Pro"
              price="1"
              priceUnit="/apt/lună"
              description="Pentru majoritatea asociațiilor"
              features={[
                'Apartamente nelimitate',
                'AI complet (OCR, predictii)',
                'Open Banking sync',
                'Plăți online (0.9%)',
                'Mobile app',
                'Priority support',
              ]}
              popular
              cta="Începe Trial 14 Zile"
              ctaHref="/auth/register?plan=pro"
            />
            <PricingCard
              title="Enterprise"
              price="0.6"
              priceUnit="/apt/lună"
              description="Pentru firme de administrare"
              features={[
                'Multi-bloc management',
                'White-label option',
                'API access',
                'Dedicated manager',
                'SLA 99.9%',
                'Custom integrations',
              ]}
              cta="Contactează-ne"
              ctaHref="/contact"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-20">
        <div className="max-w-3xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-white mb-6">
            Gata să modernizezi administrarea blocului?
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            Înregistrare în 2 minute. Setup complet în 15 minute cu AI.
            Prima chitanță generată în 30 secunde.
          </p>
          <Link
            href="/auth/register"
            className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-colors inline-block"
          >
            Începe Gratuit Acum
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-6 w-6 text-blue-400" />
                <span className="text-lg font-bold text-white">BlocHub</span>
              </div>
              <p className="text-sm">
                Platformă modernă de administrare a asociațiilor de proprietari din România.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Produs</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/features" className="hover:text-white">Funcționalități</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Prețuri</Link></li>
                <li><Link href="/demo" className="hover:text-white">Demo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Companie</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-white">Despre Noi</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
                <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-white">Confidențialitate</Link></li>
                <li><Link href="/terms" className="hover:text-white">Termeni și Condiții</Link></li>
                <li><Link href="/gdpr" className="hover:text-white">GDPR</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm">
            &copy; {new Date().getFullYear()} BlocHub. Toate drepturile rezervate.
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-md transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}

function PricingCard({
  title,
  price,
  priceUnit = '/lună',
  description,
  features,
  popular = false,
  cta,
  ctaHref,
}: {
  title: string
  price: string
  priceUnit?: string
  description: string
  features: string[]
  popular?: boolean
  cta: string
  ctaHref: string
}) {
  return (
    <div
      className={`bg-white rounded-xl p-8 ${
        popular
          ? 'ring-2 ring-blue-600 shadow-lg scale-105'
          : 'border shadow-sm'
      }`}
    >
      {popular && (
        <div className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full inline-block mb-4">
          Cel mai popular
        </div>
      )}
      <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      <p className="text-gray-500 text-sm mb-4">{description}</p>
      <div className="mb-6">
        <span className="text-4xl font-bold text-gray-900">{price}</span>
        <span className="text-gray-500"> lei{priceUnit}</span>
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href={ctaHref}
        className={`block text-center py-3 rounded-lg font-semibold transition-colors ${
          popular
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
        }`}
      >
        {cta}
      </Link>
    </div>
  )
}
