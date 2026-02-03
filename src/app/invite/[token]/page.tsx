'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, User, Mail, Phone, Lock, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface InvitationData {
  email: string
  numeInvitat: string | null
  asociatie: {
    nume: string
    adresa: string
    oras: string
  }
  apartament: {
    numar: string
  } | null
  invitedBy: {
    name: string | null
  }
}

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [userExists, setUserExists] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })

  useEffect(() => {
    validateToken()
  }, [token])

  const validateToken = async () => {
    try {
      const res = await fetch(`/api/invitations/accept?token=${token}`)
      const data = await res.json()

      if (res.ok && data.valid) {
        setInvitation(data.invitation)
        setUserExists(data.userExists)
        setFormData(prev => ({
          ...prev,
          name: data.invitation.numeInvitat || '',
        }))
      } else {
        setError(data.error || 'Invitație invalidă')
      }
    } catch (err) {
      setError('Eroare la verificarea invitației')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    // Validate passwords match for new users
    if (!userExists && formData.password !== formData.confirmPassword) {
      setError('Parolele nu coincid')
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: formData.name,
          phone: formData.phone || undefined,
          password: userExists ? undefined : formData.password,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
      } else {
        setError(data.error || 'Eroare la acceptarea invitației')
      }
    } catch (err) {
      setError('Eroare de conexiune')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Se verifică invitația...</p>
        </div>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitație Invalidă</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/auth/login">
            <Button>Mergi la Login</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Bine ai venit!</h1>
          <p className="text-gray-600 mb-6">
            Contul tău a fost creat cu succes. Acum te poți autentifica pentru a accesa platforma BlocHub.
          </p>
          <Link href="/auth/login">
            <Button className="w-full">
              Autentificare
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-14 w-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-7 w-7 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Bine ai venit pe BlocHub!</h1>
          <p className="text-gray-600 mt-2">
            Ai fost invitat să te alături asociației
          </p>
        </div>

        {/* Association Info */}
        {invitation && (
          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <h2 className="font-semibold text-blue-900 text-lg">
              {invitation.asociatie.nume}
            </h2>
            <p className="text-blue-700 text-sm">
              {invitation.asociatie.adresa}, {invitation.asociatie.oras}
            </p>
            {invitation.apartament && (
              <p className="text-blue-600 text-sm mt-2">
                Apartament: <strong>{invitation.apartament.numar}</strong>
              </p>
            )}
            {invitation.invitedBy.name && (
              <p className="text-blue-500 text-xs mt-2">
                Invitație de la: {invitation.invitedBy.name}
              </p>
            )}
          </div>
        )}

        {/* User exists notice */}
        {userExists && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-amber-900 font-medium">Cont existent</p>
                <p className="text-amber-700 text-sm">
                  Există deja un cont cu email-ul <strong>{invitation?.email}</strong>.
                  Completează formularul pentru a te asocia cu această asociație.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Mail className="h-4 w-4 inline mr-2" />
              Email
            </label>
            <Input
              type="email"
              value={invitation?.email || ''}
              disabled
              className="bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User className="h-4 w-4 inline mr-2" />
              Nume complet *
            </label>
            <Input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ion Popescu"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Phone className="h-4 w-4 inline mr-2" />
              Telefon (opțional)
            </label>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="0722 123 456"
            />
          </div>

          {!userExists && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Lock className="h-4 w-4 inline mr-2" />
                  Parolă *
                </label>
                <Input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minim 6 caractere"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Lock className="h-4 w-4 inline mr-2" />
                  Confirmă parola *
                </label>
                <Input
                  type="password"
                  required
                  minLength={6}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Repetă parola"
                />
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Se procesează...
              </>
            ) : (
              'Acceptă Invitația'
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Ai deja cont?{' '}
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            Autentifică-te
          </Link>
        </p>
      </div>
    </div>
  )
}
