'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, Mail, Lock, User, Phone, ArrowRight, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function RegisterPage() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Parolele nu coincid')
      return
    }

    if (formData.password.length < 8) {
      setError('Parola trebuie să aibă minim 8 caractere')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Eroare la înregistrare')
        return
      }

      // Redirect to login
      router.push('/auth/login?registered=true')
    } catch (err) {
      setError('A apărut o eroare. Încearcă din nou.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4 py-12">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <Link href="/" className="flex items-center justify-center gap-2 mb-4">
              <Building2 className="h-10 w-10 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">BlocHub</span>
            </Link>
            <CardTitle>Creează cont gratuit</CardTitle>
            <CardDescription>
              Începe să administrezi blocul în 15 minute
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  name="name"
                  placeholder="Nume complet"
                  value={formData.name}
                  onChange={handleChange}
                  className="pl-10"
                  required
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10"
                  required
                />
              </div>

              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="tel"
                  name="phone"
                  placeholder="Telefon (opțional)"
                  value={formData.phone}
                  onChange={handleChange}
                  className="pl-10"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="password"
                  name="password"
                  placeholder="Parolă (min. 8 caractere)"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirmă parola"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="pl-10"
                  required
                />
              </div>

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms"
                  required
                  className="rounded border-gray-300 mt-1"
                />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  Sunt de acord cu{' '}
                  <Link href="/terms" className="text-blue-600 hover:underline">
                    Termenii și Condițiile
                  </Link>{' '}
                  și{' '}
                  <Link href="/privacy" className="text-blue-600 hover:underline">
                    Politica de Confidențialitate
                  </Link>
                </label>
              </div>

              <Button type="submit" className="w-full" size="lg" loading={loading}>
                Creează cont
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              Ai deja cont?{' '}
              <Link href="/auth/login" className="text-blue-600 hover:underline font-medium">
                Autentifică-te
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Benefits */}
        <div className="mt-8 space-y-3">
          <Benefit text="Gratuit pentru max 20 apartamente" />
          <Benefit text="Setup complet în 15 minute cu AI" />
          <Benefit text="Fără card necesar pentru început" />
          <Benefit text="95% automatizare - economisești 70% timp" />
        </div>
      </div>
    </div>
  )
}

function Benefit({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
      <span>{text}</span>
    </div>
  )
}
