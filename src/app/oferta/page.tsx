'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  CheckCircle2, Clock, Zap, CreditCard, FileText, BellRing, ShieldCheck, Loader2,
} from 'lucide-react'

interface OfferStatus {
  tierMonths: number
  spotsRemaining: number
  spotsTotal: number
}

const BENEFITS = [
  { icon: Zap, title: 'Excel manual → automat', text: 'Chitanțe generate în 30 de secunde, nu în 30 de minute. Platformă 95% automatizată cu AI.' },
  { icon: CreditCard, title: 'Plăți online (Revolut)', text: 'Locatarii plătesc întreținerea online. Banii ajung direct, fără drumuri la administrator.' },
  { icon: FileText, title: 'Transparență cheltuieli', text: 'Fiecare leu cheltuit e vizibil pentru proprietari. Mai puține întrebări, mai multă încredere.' },
  { icon: BellRing, title: 'Avizier digital', text: 'Anunțuri către tot blocul instant, pe telefon. Fără hârtii lipite pe ușă.' },
  { icon: ShieldCheck, title: 'Restanțe sub control', text: 'Vezi cine a plătit și cine nu, în timp real. Notificări automate pentru restanțieri.' },
]

export default function OfertaPage() {
  const [status, setStatus] = useState<OfferStatus | null>(null)
  const [form, setForm] = useState({ name: '', association: '', email: '', phone: '', city: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{ tierMonths: number; full: boolean } | null>(null)

  useEffect(() => {
    fetch('/api/oferta')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStatus(d))
      .catch(() => {})
  }, [])

  const setField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})
    try {
      const res = await fetch('/api/oferta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.details) {
          const flat: Record<string, string> = {}
          for (const [k, v] of Object.entries(data.details)) {
            if (Array.isArray(v) && v[0]) flat[k] = v[0] as string
          }
          setErrors(flat)
        } else {
          setErrors({ _form: data.error || 'A apărut o eroare. Încearcă din nou.' })
        }
        return
      }
      setDone({ tierMonths: data.tierMonths, full: data.full })
      if (typeof data.spotsRemaining === 'number') {
        setStatus((s) => (s ? { ...s, spotsRemaining: data.spotsRemaining } : s))
      }
    } catch {
      setErrors({ _form: 'Conexiune eșuată. Încearcă din nou.' })
    } finally {
      setSubmitting(false)
    }
  }

  const months = status?.tierMonths
  const remaining = status?.spotsRemaining

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Nav */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">BlocX</Link>
          <Link href="/pricing" className="text-sm text-gray-500 hover:text-gray-900">Prețuri</Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
            <Clock className="w-4 h-4" /> Ofertă pentru primii administratori
          </span>
          <h1 className="mt-5 text-4xl sm:text-5xl font-bold text-gray-900">
            {months != null ? (
              <>
                până la <span className="text-blue-600">{months} luni</span> gratis pe BlocX
              </>
            ) : (
              <>Luni gratis pe BlocX</>
            )}
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Administrezi un bloc? Treci pe platforma 95% automatizată cu AI și primești
            primele luni complet gratuit. Fără card, fără obligații.
          </p>

          {/* Urgency — current offer + scarcity only, never the schedule */}
          {remaining != null && (
            <div className="mt-6 inline-flex flex-col items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3">
              {remaining > 0 ? (
                <span className="text-amber-800 font-semibold">
                  Locuri limitate — au mai rămas doar {remaining}
                </span>
              ) : (
                <span className="text-amber-800 font-semibold">
                  Locurile la oferta curentă s-au epuizat — înscrie-te pe lista de așteptare
                </span>
              )}
              <span className="text-sm text-amber-700">
                Nu se știe câte luni vor mai fi gratis săptămâna viitoare. Grăbește-te.
              </span>
            </div>
          )}

          {/* Lucky wheel CTA */}
          <div className="mt-6">
            <Link
              href="/roata"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 font-semibold text-amber-950 hover:bg-amber-300"
            >
              🎡 Învârte roata și vezi câte luni gratis primești
            </Link>
          </div>
        </div>

        {/* Benefits + Form */}
        <div className="mt-14 grid md:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">De ce administratorii aleg BlocX</h2>
            <ul className="space-y-4">
              {BENEFITS.map((b) => (
                <li key={b.title} className="flex gap-3">
                  <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <b.icon className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{b.title}</p>
                    <p className="text-sm text-gray-600">{b.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Form / thank-you */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            {done ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
                <h3 className="mt-4 text-xl font-semibold text-gray-900">Te-ai înscris! 🎉</h3>
                <p className="mt-2 text-gray-600">
                  {done.full
                    ? 'Ești pe lista de așteptare. Te contactăm imediat ce se eliberează un loc sau cu oferta curentă.'
                    : `Ți-am rezervat ${done.tierMonths} luni gratis. Te contactăm în scurt timp ca să-ți activăm contul.`}
                </p>
                <Link href="/" className="mt-6 inline-block text-sm text-blue-600 hover:underline">
                  ← Înapoi la pagina principală
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Revendică-ți {months != null ? `cele ${months} luni gratis` : 'lunile gratis'}
                </h3>
                <Input label="Nume și prenume" value={form.name} onChange={setField('name')} error={errors.name} placeholder="Ion Popescu" />
                <Input label="Asociația / blocul" value={form.association} onChange={setField('association')} error={errors.association} placeholder="Asociația Bloc 12, Sc. A" />
                <Input label="Email" type="email" value={form.email} onChange={setField('email')} error={errors.email} placeholder="email@exemplu.ro" />
                <Input label="Telefon" value={form.phone} onChange={setField('phone')} error={errors.phone} placeholder="07xx xxx xxx" />
                <Input label="Oraș" value={form.city} onChange={setField('city')} error={errors.city} placeholder="București" />
                {errors._form && <p className="text-sm text-red-500">{errors._form}</p>}
                <Button type="submit" size="lg" loading={submitting} className="w-full">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Vreau lunile gratis'}
                </Button>
                <p className="text-xs text-gray-400 text-center">
                  Fără card. Te contactăm telefonic ca să-ți activăm contul.
                </p>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
