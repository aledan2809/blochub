'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ClockWheel, rotationForTarget } from '@/components/roata/ClockWheel'

interface Status {
  active: boolean
  endsAt: string
  segments: number
  spinsPerDay: number
  cooldownSec: number
  maxTwelve: number
  twelveRemaining: number
}

const todayKey = () => new Date().toISOString().slice(0, 10)
const lsGet = (k: string) => (typeof window === 'undefined' ? null : window.localStorage.getItem(k))
const lsSet = (k: string, v: string) => { if (typeof window !== 'undefined') window.localStorage.setItem(k, v) }

export default function RoataPage() {
  const [status, setStatus] = useState<Status | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [results, setResults] = useState<number[]>([])
  const [spinsToday, setSpinsToday] = useState(0)
  const [lastSpinTs, setLastSpinTs] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)

  const [form, setForm] = useState({ name: '', association: '', email: '', phone: '', city: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [claimed, setClaimed] = useState<number | null>(null)
  const spinLock = useRef(false)

  // Load status + restore today's local state.
  useEffect(() => {
    fetch('/api/roata').then((r) => (r.ok ? r.json() : null)).then((d) => d && setStatus(d)).catch(() => {})
    const dk = todayKey()
    setSpinsToday(parseInt(lsGet(`roata_${dk}_spins`) || '0', 10) || 0)
    try { setResults(JSON.parse(lsGet(`roata_${dk}_results`) || '[]')) } catch { /* ignore */ }
    setLastSpinTs(parseInt(lsGet('roata_lastSpin') || '0', 10) || 0)
    const c = lsGet('roata_claimed')
    if (c) setClaimed(parseInt(c, 10))
  }, [])

  // 1s tick for countdown + cooldown.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const cooldownLeft = status ? Math.max(0, status.cooldownSec - Math.floor((now - lastSpinTs) / 1000)) : 0
  const spinsLeft = status ? Math.max(0, status.spinsPerDay - spinsToday) : 0
  const canSpin = !!status && status.active && !spinning && cooldownLeft <= 0 && spinsLeft > 0 && claimed === null

  const handleSpin = useCallback(async () => {
    if (!canSpin || spinLock.current) return
    spinLock.current = true
    setSpinning(true)
    try {
      const res = await fetch('/api/roata/spin', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || typeof data.months !== 'number') { setSpinning(false); spinLock.current = false; return }
      const months: number = data.months
      setRotation((r) => rotationForTarget(r, months))
      // Reveal after the animation settles.
      window.setTimeout(() => {
        const dk = todayKey()
        setResults((prev) => {
          const next = [...prev, months]
          lsSet(`roata_${dk}_results`, JSON.stringify(next))
          return next
        })
        setSpinsToday((s) => { const n = s + 1; lsSet(`roata_${dk}_spins`, String(n)); return n })
        const ts = Date.now(); setLastSpinTs(ts); lsSet('roata_lastSpin', String(ts))
        setSpinning(false)
        spinLock.current = false
      }, 4300)
    } catch {
      setSpinning(false); spinLock.current = false
    }
  }, [canSpin])

  const best = results.length ? Math.max(...results) : null
  const toClaim = chosen ?? best

  const setField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function claim(e: React.FormEvent) {
    e.preventDefault()
    if (!toClaim) return
    setSubmitting(true); setErrors({})
    try {
      const res = await fetch('/api/roata/claim', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, freeMonths: toClaim }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.details) {
          const flat: Record<string, string> = {}
          for (const [k, v] of Object.entries(data.details)) if (Array.isArray(v) && v[0]) flat[k] = v[0] as string
          setErrors(flat)
        } else setErrors({ _form: data.error || 'Eroare. Încearcă din nou.' })
        return
      }
      setClaimed(toClaim); lsSet('roata_claimed', String(toClaim))
    } catch {
      setErrors({ _form: 'Conexiune eșuată.' })
    } finally {
      setSubmitting(false)
    }
  }

  // Countdown parts.
  const endMs = status ? new Date(status.endsAt).getTime() : 0
  const left = Math.max(0, endMs - now)
  const cd = {
    d: Math.floor(left / 86400000),
    h: Math.floor((left % 86400000) / 3600000),
    m: Math.floor((left % 3600000) / 60000),
    s: Math.floor((left % 60000) / 1000),
  }
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">BlocX</Link>
          <Link href="/oferta" className="text-sm text-gray-500 hover:text-gray-900">Oferta</Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
            🎡 Roata administratorilor — luni gratis pe BlocX
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-gray-900">Învârte roata. Vezi câte luni gratis primești.</h1>
          <p className="mt-3 text-gray-600">
            Ai <b>{status?.spinsPerDay ?? 5} învârtiri pe zi</b>. Păstrezi cel mai bun rezultat al zilei (maxim 12 luni).
            Nu ești mulțumit? Revii mâine. Dar grăbește-te — campania ține puțin.
          </p>

          {/* Countdown */}
          {status && (
            <div className="mt-5 inline-flex gap-2">
              {[['Zile', cd.d], ['Ore', cd.h], ['Min', cd.m], ['Sec', cd.s]].map(([lbl, v]) => (
                <div key={lbl as string} className="rounded-xl bg-gray-900 px-3 py-2 text-center min-w-[58px]">
                  <div className="text-2xl font-bold text-white tabular-nums">{pad(v as number)}</div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-400">{lbl}</div>
                </div>
              ))}
            </div>
          )}
          {status && (
            <p className="mt-3 text-sm text-amber-700">
              🔥 Doar <b>{status.twelveRemaining}</b> din {status.maxTwelve} locuri de <b>12 luni</b> rămase
            </p>
          )}
        </div>

        {status && !status.active ? (
          <div className="mt-10 text-center text-gray-600">Campania nu este activă momentan.</div>
        ) : claimed !== null ? (
          <div className="mt-10 max-w-md mx-auto rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="text-2xl font-semibold text-gray-900">{claimed} luni gratis blocate!</h2>
            <p className="mt-2 text-gray-600">Te contactăm să-ți activăm contul BlocX cu {claimed} luni gratuite.</p>
            <Link href="/" className="mt-6 inline-block text-sm text-blue-600 hover:underline">← Înapoi la pagina principală</Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-10 md:grid-cols-2 md:items-start">
            {/* Wheel + spin */}
            <div className="text-center">
              <ClockWheel rotation={rotation} spinning={spinning} />
              <div className="mt-4">
                <Button size="lg" onClick={handleSpin} disabled={!canSpin} className="w-full max-w-xs">
                  {spinning ? 'Se învârte…' : cooldownLeft > 0 ? `Mai așteaptă ${cooldownLeft}s` : spinsLeft > 0 ? `Învârte (${spinsLeft} rămase azi)` : 'Revino mâine'}
                </Button>
                {/* Cooldown thermometer */}
                {cooldownLeft > 0 && status && (
                  <div className="mt-3 mx-auto max-w-xs">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                      <div className="h-full bg-amber-400 transition-all" style={{ width: `${100 - (cooldownLeft / status.cooldownSec) * 100}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Următoarea învârtire în {cooldownLeft}s</p>
                  </div>
                )}
              </div>

              {/* Today's results */}
              {results.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm text-gray-500 mb-2">Rezultatele de azi — alege ce păstrezi:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {results.map((m, i) => (
                      <button
                        key={i}
                        onClick={() => setChosen(m)}
                        className={`h-12 w-12 rounded-full border-2 text-lg font-bold ${toClaim === m ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-800 hover:border-blue-400'}`}
                      >{m}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Claim form */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
              {toClaim ? (
                <>
                  <h3 className="text-lg font-semibold text-gray-900">Păstrează <span className="text-blue-600">{toClaim} luni gratis</span></h3>
                  <p className="mt-1 text-sm text-gray-500">Completează ca să-ți blocăm rezultatul în cont.</p>
                  <form onSubmit={claim} className="mt-4 space-y-3">
                    <Input label="Nume și prenume" value={form.name} onChange={setField('name')} error={errors.name} placeholder="Ion Popescu" />
                    <Input label="Asociația / blocul" value={form.association} onChange={setField('association')} error={errors.association} placeholder="Asociația Bloc 12" />
                    <Input label="Email" type="email" value={form.email} onChange={setField('email')} error={errors.email} placeholder="email@exemplu.ro" />
                    <Input label="Telefon" value={form.phone} onChange={setField('phone')} error={errors.phone} placeholder="07xx xxx xxx" />
                    <Input label="Oraș" value={form.city} onChange={setField('city')} error={errors.city} placeholder="București" />
                    {errors._form && <p className="text-sm text-red-500">{errors._form}</p>}
                    <Button type="submit" size="lg" loading={submitting} className="w-full">Blochează {toClaim} luni gratis</Button>
                  </form>
                </>
              ) : (
                <div className="text-center text-gray-500 py-10">
                  <div className="text-4xl mb-3">🎡</div>
                  <p>Învârte roata ca să vezi câte luni gratis primești, apoi păstrează rezultatul.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mechanism / rules */}
        <section className="mt-16 max-w-2xl mx-auto text-sm text-gray-500">
          <h3 className="text-base font-semibold text-gray-700">Cum funcționează</h3>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Ai {status?.spinsPerDay ?? 5} învârtiri pe zi, cu pauză de {status?.cooldownSec ?? 60} secunde între ele.</li>
            <li>Roata arată de la 1 la 12 luni gratuite. Păstrezi cel mai bun rezultat al zilei.</li>
            <li>Dacă nu ești mulțumit, revii a doua zi pentru încă {status?.spinsPerDay ?? 5} învârtiri.</li>
            <li>Doar primele {status?.maxTwelve ?? 20} conturi pot primi 12 luni gratis. După aceea, maximul scade.</li>
            <li>Participarea e gratuită. Rezultatul se activează după ce te contactăm și îți creăm contul.</li>
          </ul>
        </section>
      </main>
    </div>
  )
}
