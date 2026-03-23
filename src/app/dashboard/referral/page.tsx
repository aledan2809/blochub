'use client'

import { useEffect, useState } from 'react'
import {
  Copy, Check, Send, Users, Gift, Loader2,
  Share2, Clock, UserCheck, Trophy, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ReferralData {
  referralCode: string
  referralLink: string
  referrals: Array<{
    id: string
    referredEmail: string | null
    status: string
    rewardAmount: number | null
    createdAt: string
    registeredAt: string | null
    activatedAt: string | null
    referred: { name: string | null } | null
  }>
  stats: {
    total: number
    pending: number
    registered: number
    active: number
    totalXpEarned: number
  }
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: 'Trimis', color: 'text-yellow-600 bg-yellow-50', icon: Clock },
  REGISTERED: { label: 'Înregistrat', color: 'text-blue-600 bg-blue-50', icon: UserCheck },
  ACTIVE: { label: 'Activ', color: 'text-green-600 bg-green-50', icon: Check },
  REWARDED: { label: 'Recompensat', color: 'text-purple-600 bg-purple-50', icon: Gift },
  EXPIRED: { label: 'Expirat', color: 'text-gray-500 bg-gray-50', icon: Clock },
}

const REWARDS_INFO = [
  { threshold: 1, reward: '+80 XP', badge: 'Prima recomandare 🤝' },
  { threshold: 3, reward: '+100 XP', badge: 'Streak de referral-uri 🔥' },
  { threshold: 5, reward: '+150 XP', badge: 'Influencer local 📣' },
  { threshold: 10, reward: '+250 XP', badge: 'Ambasador BlocX 🏅' },
]

export default function ReferralPage() {
  const [data, setData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const res = await fetch('/api/referral')
      if (res.ok) {
        setData(await res.json())
      }
    } catch {
      // non-critical
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy(text: string, type: 'code' | 'link') {
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  async function handleSendReferral(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    setError('')
    setSendSuccess(false)

    try {
      const res = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const json = await res.json()
      if (res.ok) {
        setSendSuccess(true)
        setEmail('')
        fetchData()
        setTimeout(() => setSendSuccess(false), 3000)
      } else {
        setError(json.error || 'Eroare la trimitere')
      }
    } catch {
      setError('Eroare de rețea')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!data) return null

  const nextReward = REWARDS_INFO.find((r) => r.threshold > data.stats.active)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Recomandă BlocX</h1>
        <p className="text-gray-500 mt-1">
          Invită alți administratori de asociații și câștigă recompense
        </p>
      </div>

      {/* Referral Code & Link */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Share2 className="h-5 w-5 text-blue-600" />
            Codul tău de referral
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Code */}
          <div className="flex items-center gap-3">
            <div className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-center">
              <span className="text-2xl font-mono font-bold text-blue-700 tracking-wider">
                {data.referralCode}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(data.referralCode, 'code')}
              className="gap-2"
            >
              {copied === 'code' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copied === 'code' ? 'Copiat!' : 'Copiază'}
            </Button>
          </div>

          {/* Link */}
          <div className="flex items-center gap-3">
            <div className="flex-1 px-3 py-2 bg-gray-50 rounded-lg border text-sm text-gray-600 truncate">
              {data.referralLink}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(data.referralLink, 'link')}
              className="gap-2"
            >
              {copied === 'link' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copied === 'link' ? 'Copiat!' : 'Link'}
            </Button>
          </div>

          {/* Send by email */}
          <form onSubmit={handleSendReferral} className="flex items-center gap-3 pt-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email administrator alt bloc..."
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Button type="submit" disabled={sending || !email.trim()} className="gap-2">
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Trimite
            </Button>
          </form>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {sendSuccess && <p className="text-sm text-green-600">Invitație trimisă cu succes!</p>}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{data.stats.total}</p>
            <p className="text-xs text-gray-500 mt-1">Total trimise</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">{data.stats.pending}</p>
            <p className="text-xs text-gray-500 mt-1">În așteptare</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-green-600">{data.stats.active}</p>
            <p className="text-xs text-gray-500 mt-1">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-purple-600">{data.stats.totalXpEarned}</p>
            <p className="text-xs text-gray-500 mt-1">XP câștigat</p>
          </CardContent>
        </Card>
      </div>

      {/* Rewards Roadmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Recompense referral
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {REWARDS_INFO.map((reward) => {
              const achieved = data.stats.active >= reward.threshold
              return (
                <div
                  key={reward.threshold}
                  className={`flex items-center gap-4 p-3 rounded-xl border transition-colors ${
                    achieved ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    achieved ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {achieved ? <Check className="w-5 h-5" /> : reward.threshold}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${achieved ? 'text-green-800' : 'text-gray-700'}`}>
                      {reward.badge}
                    </p>
                    <p className="text-xs text-gray-500">
                      {reward.threshold} {reward.threshold === 1 ? 'asociație activă' : 'asociații active'}
                    </p>
                  </div>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                    achieved ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {reward.reward}
                  </span>
                </div>
              )
            })}
          </div>

          {nextReward && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm text-blue-800">
                <strong>Următorul obiectiv:</strong> mai ai nevoie de{' '}
                <strong>{nextReward.threshold - data.stats.active}</strong>{' '}
                {nextReward.threshold - data.stats.active === 1 ? 'referral activ' : 'referral-uri active'} pentru{' '}
                <strong>{nextReward.badge}</strong>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral History */}
      {data.referrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-gray-600" />
              Istoric invitații ({data.referrals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {data.referrals.map((ref) => {
                const statusInfo = STATUS_MAP[ref.status] || STATUS_MAP.PENDING
                const StatusIcon = statusInfo.icon
                return (
                  <div key={ref.id} className="flex items-center gap-3 py-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${statusInfo.color}`}>
                      <StatusIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {ref.referred?.name || ref.referredEmail || 'Invitație trimisă'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(ref.createdAt).toLocaleDateString('ro-RO')}
                        {ref.activatedAt && ` — activat ${new Date(ref.activatedAt).toLocaleDateString('ro-RO')}`}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cum funcționează?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Share2 className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-1">1. Trimite codul</h4>
              <p className="text-sm text-gray-500">Copiază link-ul sau trimite prin email unui alt administrator</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-1">2. Se înregistrează</h4>
              <p className="text-sm text-gray-500">Noul admin creează cont și configurează asociația lui</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Gift className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-1">3. Primești XP</h4>
              <p className="text-sm text-gray-500">Câștigi XP și deblochezi realizări speciale de referral</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
