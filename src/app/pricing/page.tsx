import { Metadata } from 'next'
import Link from 'next/link'
import { Building2, Check, Zap, Shield, Users, Headphones, Globe, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Prețuri - Planuri pentru orice asociație',
  description: 'Alege planul potrivit pentru asociația ta. De la gratuit pentru blocuri mici până la Enterprise pentru firme de administrare. Transparent, fără costuri ascunse.',
  openGraph: {
    title: 'Prețuri BlocX - Planuri pentru orice asociație',
    description: 'Alege planul potrivit pentru asociația ta. De la gratuit pentru blocuri mici până la Enterprise.',
  },
}

const plans = [
  {
    name: 'Basic',
    subtitle: 'Pentru blocuri mici',
    price: '0',
    priceUnit: 'lei/lună',
    description: 'Perfect pentru asociații cu până la 20 de apartamente care vor să înceapă digitalizarea.',
    features: [
      'Până la 20 apartamente',
      'Generare chitanțe automate',
      'Portal proprietari',
      'Avizier digital',
      'Email support',
      'Backup automat',
    ],
    limitations: [
      'Fără AI avansat',
      'Fără plăți online',
    ],
    cta: 'Începe Gratuit',
    ctaHref: '/auth/register?plan=basic',
    popular: false,
    highlight: false,
  },
  {
    name: 'Pro',
    subtitle: 'Cel mai popular',
    price: '1',
    priceUnit: 'lei/apt/lună',
    description: 'Soluția completă pentru majoritatea asociațiilor. Automatizare 95% cu AI.',
    features: [
      'Apartamente nelimitate',
      'AI complet (OCR, predicții)',
      'Open Banking sync',
      'Plăți online (0.9% comision)',
      'Mobile app iOS & Android',
      'Rapoarte avansate',
      'Priority support 24/7',
      'Export contabil automat',
      'Multi-scară support',
    ],
    limitations: [],
    cta: 'Începe Trial 14 Zile',
    ctaHref: '/auth/register?plan=pro',
    popular: true,
    highlight: true,
  },
  {
    name: 'Enterprise',
    subtitle: 'Pentru firme de administrare',
    price: '0.60',
    priceUnit: 'lei/apt/lună',
    description: 'Pentru firme care administrează multiple asociații. Discount la volum și funcții avansate.',
    features: [
      'Tot din Pro, plus:',
      'Multi-bloc management centralizat',
      'White-label opțional',
      'API access complet',
      'Account manager dedicat',
      'SLA 99.9% uptime',
      'Integrări custom',
      'Training on-site',
      'Facturare consolidată',
    ],
    limitations: [],
    cta: 'Contactează Vânzări',
    ctaHref: '/contact?plan=enterprise',
    popular: false,
    highlight: false,
  },
]

const features = [
  {
    icon: Zap,
    title: 'Setup în 15 minute',
    description: 'AI-ul nostru importă datele și configurează totul automat.',
  },
  {
    icon: Shield,
    title: 'Securitate GDPR',
    description: 'Date criptate, backup zilnic, audit trail complet.',
  },
  {
    icon: Users,
    title: 'Portal Proprietari',
    description: 'Fiecare proprietar are acces la chitanțe și documente.',
  },
  {
    icon: Headphones,
    title: 'Support Dedicat',
    description: 'Echipa noastră te ajută la orice pas.',
  },
]

const faqs = [
  {
    question: 'Pot să trec de la Basic la Pro oricând?',
    answer: 'Da, poți face upgrade oricând. Plătești doar diferența proporțional cu zilele rămase din lună.',
  },
  {
    question: 'Ce se întâmplă dacă depășesc 20 apartamente pe Basic?',
    answer: 'Vei primi o notificare și vei avea 30 de zile să faci upgrade la Pro sau să reduci numărul de apartamente.',
  },
  {
    question: 'Există contracte pe termen lung?',
    answer: 'Nu, toate planurile sunt lunare și poți anula oricând. Enterprise poate avea discount pentru plată anuală.',
  },
  {
    question: 'Cum funcționează comisionul de 0.9% pentru plăți?',
    answer: 'Este comisionul procesatorului de plăți (Stripe). Se aplică doar când proprietarii plătesc online cu cardul.',
  },
  {
    question: 'Datele mele sunt în siguranță?',
    answer: 'Absolut. Folosim criptare AES-256, servere în UE, backup zilnic și respectăm GDPR complet.',
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">BlocX</span>
            </Link>
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

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Prețuri simple și transparente
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Fără costuri ascunse. Fără surprize. Alege planul care se potrivește asociației tale.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white rounded-2xl p-8 ${
                plan.highlight
                  ? 'ring-2 ring-blue-600 shadow-xl scale-105 z-10'
                  : 'border shadow-sm'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-600 text-white text-sm font-semibold px-4 py-1 rounded-full">
                    Cel mai popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-gray-500">{plan.subtitle}</p>
              </div>

              <div className="mb-6">
                <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-gray-500 ml-2">{plan.priceUnit}</span>
              </div>

              <p className="text-gray-600 mb-6">{plan.description}</p>

              <Link
                href={plan.ctaHref}
                className={`block text-center py-3 px-6 rounded-lg font-semibold transition-colors mb-8 ${
                  plan.highlight
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {plan.cta}
                <ArrowRight className="inline-block ml-2 h-4 w-4" />
              </Link>

              <div className="space-y-3">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
                {plan.limitations.map((limitation, i) => (
                  <div key={i} className="flex items-start gap-3 text-gray-400">
                    <span className="h-5 w-5 flex items-center justify-center flex-shrink-0">—</span>
                    <span>{limitation}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Inclus în toate planurile
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 text-blue-600 mb-4">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Întrebări frecvente
        </h2>
        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
              <p className="text-gray-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-16">
        <div className="max-w-3xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-white mb-4">
            Gata să începi?
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            Încearcă gratuit pentru 14 zile. Fără card necesar.
          </p>
          <Link
            href="/auth/register"
            className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-colors inline-block"
          >
            Creează cont gratuit
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
                <span className="text-lg font-bold text-white">BlocX</span>
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
            &copy; {new Date().getFullYear()} BlocX. Toate drepturile rezervate.
          </div>
        </div>
      </footer>
    </div>
  )
}
