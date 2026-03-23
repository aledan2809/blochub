'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Copy, Check, Send, Users, Gift, Loader2, Share2, Clock,
  UserCheck, Trophy, ChevronRight, Phone, Mail, MessageSquare,
  Link2, AlertCircle, X, Eye, PhoneCall, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Reminder {
  id: string
  referralId: string
  referredName: string
  type: string
  message: string
  channel: string
}

interface ReferralItem {
  id: string
  referredName: string | null
  referredEmail: string | null
  referredPhone: string | null
  channel: string
  status: string
  linkClickCount: number
  linkClickedAt: string | null
  contactedAt: string | null
  contactResult: string | null
  notes: string | null
  rewardAmount: number | null
  reminderCount: number
  createdAt: string
  registeredAt: string | null
  activatedAt: string | null
  referred: { name: string | null } | null
}

interface ReferralData {
  referralCode: string
  referralLink: string
  referrals: ReferralItem[]
  activeReminders: Reminder[]
  stats: {
    total: number; pending: number; linkOpened: number; registered: number
    active: number; notInterested: number
    byChannel: { email: number; whatsapp: number; sms: number; link: number }
    totalXpEarned: number
  }
  channelXP: Record<string, number>
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: 'Trimis', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: Clock },
  LINK_OPENED: { label: 'Link deschis', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: Eye },
  REGISTERED: { label: 'Înregistrat', color: 'text-indigo-600 bg-indigo-50 border-indigo-200', icon: UserCheck },
  ACTIVE: { label: 'Activ', color: 'text-green-600 bg-green-50 border-green-200', icon: Check },
  REWARDED: { label: 'Recompensat', color: 'text-purple-600 bg-purple-50 border-purple-200', icon: Gift },
  NOT_INTERESTED: { label: 'Neinteresat', color: 'text-gray-500 bg-gray-50 border-gray-200', icon: X },
  EXPIRED: { label: 'Expirat', color: 'text-gray-400 bg-gray-50 border-gray-200', icon: Clock },
}

const CHANNEL_CONFIG: Record<string, { label: string; icon: typeof Mail; color: string }> = {
  EMAIL: { label: 'Email', icon: Mail, color: 'text-blue-600' },
  WHATSAPP: { label: 'WhatsApp', icon: MessageSquare, color: 'text-green-600' },
  SMS: { label: 'SMS', icon: Phone, color: 'text-purple-600' },
  LINK_ONLY: { label: 'Link', icon: Link2, color: 'text-gray-600' },
}

export default function ReferralPage() {
  const [data, setData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  // Send form
  const [sendChannel, setSendChannel] = useState<string>('WHATSAPP')
  const [sendEmail, setSendEmail] = useState('')
  const [sendPhone, setSendPhone] = useState('')
  const [sendName, setSendName] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/referral')
      if (res.ok) setData(await res.json())
    } catch { /* non-critical */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleCopy(text: string, type: string) {
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setSendResult(null)
    try {
      const res = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: sendChannel,
          email: sendChannel === 'EMAIL' ? sendEmail : undefined,
          phone: (sendChannel === 'WHATSAPP' || sendChannel === 'SMS') ? sendPhone : undefined,
          name: sendName || undefined,
        }),
      })
      const json = await res.json()
      if (res.ok) {
        setSendResult({ type: 'success', msg: `Invitație trimisă! Vei primi +${json.referral.xpReward} XP când se activează.` })
        setSendEmail(''); setSendPhone(''); setSendName('')
        fetchData()
      } else {
        setSendResult({ type: 'error', msg: json.error })
      }
    } catch { setSendResult({ type: 'error', msg: 'Eroare de rețea' }) }
    finally { setSending(false) }
  }

  async function handleReminderAction(referralId: string, reminderId: string, action: string) {
    await fetch('/api/referral', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referralId, reminderId, action }),
    })
    fetchData()
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
  }
  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Recomandă BlocX</h1>
        <p className="text-gray-500 mt-1">Invită alți administratori și câștigă XP — WhatsApp, SMS sau Email</p>
      </div>

      {/* Active Reminders (CRM alerts) */}
      {data.activeReminders.length > 0 && (
        <div className="space-y-3">
          {data.activeReminders.map((reminder) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              onAction={handleReminderAction}
            />
          ))}
        </div>
      )}

      {/* Code & Link */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Share2 className="h-5 w-5 text-blue-600" />
            Codul tău de referral
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-center">
              <span className="text-2xl font-mono font-bold text-blue-700 tracking-wider">{data.referralCode}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleCopy(data.referralCode, 'code')} className="gap-2">
              {copied === 'code' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copied === 'code' ? 'Copiat!' : 'Copiază'}
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 px-3 py-2 bg-gray-50 rounded-lg border text-sm text-gray-600 truncate">{data.referralLink}</div>
            <Button variant="outline" size="sm" onClick={() => handleCopy(data.referralLink, 'link')} className="gap-2">
              {copied === 'link' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copied === 'link' ? 'Copiat!' : 'Link'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Multi-channel Send Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Trimite invitație</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Channel selector */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {Object.entries(CHANNEL_CONFIG).map(([key, cfg]) => {
              const Icon = cfg.icon
              const xp = data.channelXP[key] || 0
              return (
                <button
                  key={key}
                  onClick={() => setSendChannel(key)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                    sendChannel === key
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${sendChannel === key ? cfg.color : 'text-gray-400'}`} />
                  <span className="text-xs font-medium">{cfg.label}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    sendChannel === key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                  }`}>+{xp} XP</span>
                </button>
              )
            })}
          </div>

          <form onSubmit={handleSend} className="space-y-3">
            <input
              type="text"
              value={sendName}
              onChange={(e) => setSendName(e.target.value)}
              placeholder="Numele persoanei (opțional)"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />

            {sendChannel === 'EMAIL' && (
              <input
                type="email"
                value={sendEmail}
                onChange={(e) => setSendEmail(e.target.value)}
                placeholder="Email administrator..."
                required
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            )}

            {(sendChannel === 'WHATSAPP' || sendChannel === 'SMS') && (
              <input
                type="tel"
                value={sendPhone}
                onChange={(e) => setSendPhone(e.target.value)}
                placeholder="Număr telefon (ex: 0721234567)"
                required
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            )}

            {sendChannel === 'LINK_ONLY' && (
              <p className="text-sm text-gray-500 italic">
                Copiază link-ul de mai sus și trimite-l cum dorești. Vom înregistra referral-ul automat.
              </p>
            )}

            <Button type="submit" disabled={sending || (sendChannel === 'LINK_ONLY')} className="w-full gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Trimite prin {CHANNEL_CONFIG[sendChannel]?.label || sendChannel}
            </Button>
          </form>

          {sendResult && (
            <p className={`text-sm mt-2 ${sendResult.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {sendResult.msg}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard value={data.stats.total} label="Total trimise" color="text-blue-600" />
        <StatCard value={data.stats.pending + data.stats.linkOpened} label="În așteptare" color="text-yellow-600" />
        <StatCard value={data.stats.active} label="Active" color="text-green-600" />
        <StatCard value={data.stats.totalXpEarned} label="XP câștigat" color="text-purple-600" />
      </div>

      {/* Channel breakdown */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(CHANNEL_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon
          const count = data.stats.byChannel[key.toLowerCase() as keyof typeof data.stats.byChannel] || 0
          return (
            <div key={key} className="flex items-center gap-2 p-3 bg-white rounded-xl border">
              <Icon className={`h-4 w-4 ${cfg.color}`} />
              <div>
                <p className="text-lg font-bold text-gray-900">{count}</p>
                <p className="text-[10px] text-gray-500">{cfg.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Rewards Roadmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Recompense
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-gray-500 mb-3">
            XP-ul variază: WhatsApp (+{data.channelXP.WHATSAPP}) {'>'} SMS (+{data.channelXP.SMS}) {'>'} Email (+{data.channelXP.EMAIL}) {'>'} Link (+{data.channelXP.LINK_ONLY})
          </div>
          <div className="space-y-2">
            {[
              { t: 1, badge: 'Prima recomandare 🤝', xp: 80 },
              { t: 3, badge: 'Streak de referral-uri 🔥', xp: 100 },
              { t: 5, badge: 'Influencer local 📣', xp: 150 },
              { t: 10, badge: 'Ambasador BlocX 🏅', xp: 250 },
            ].map((r) => {
              const achieved = data.stats.active >= r.t
              return (
                <div key={r.t} className={`flex items-center gap-3 p-2.5 rounded-lg border ${achieved ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${achieved ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                    {achieved ? <Check className="w-4 h-4" /> : r.t}
                  </div>
                  <span className={`flex-1 text-sm font-medium ${achieved ? 'text-green-800' : 'text-gray-700'}`}>{r.badge}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${achieved ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>+{r.xp} XP</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Referral History with CRM */}
      {data.referrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Invitații ({data.referrals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.referrals.map((ref) => (
                <ReferralRow key={ref.id} referral={ref} onAction={handleReminderAction} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* How it works */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Cum funcționează?</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { icon: Share2, color: 'blue', title: '1. Alege canalul', desc: 'WhatsApp, SMS, Email sau Link' },
              { icon: Send, color: 'green', title: '2. Trimite', desc: 'Invitația ajunge direct la destinatar' },
              { icon: UserCheck, color: 'indigo', title: '3. Se înregistrează', desc: 'Noul admin creează asociația' },
              { icon: Gift, color: 'purple', title: '4. Primești XP', desc: 'XP diferit pe fiecare canal' },
            ].map((step) => (
              <div key={step.title} className="text-center p-3">
                <div className={`w-10 h-10 bg-${step.color}-100 rounded-full flex items-center justify-center mx-auto mb-2`}>
                  <step.icon className={`w-5 h-5 text-${step.color}-600`} />
                </div>
                <h4 className="font-medium text-gray-900 text-sm mb-0.5">{step.title}</h4>
                <p className="text-xs text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4 text-center">
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
      </CardContent>
    </Card>
  )
}

function ReminderCard({ reminder, onAction }: { reminder: Reminder; onAction: (rid: string, remId: string, action: string) => void }) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-amber-900">{reminder.message}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {!showActions ? (
              <>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => {
                  onAction(reminder.referralId, reminder.id, 'contacted')
                  setShowActions(true)
                }}>
                  <PhoneCall className="w-3 h-3" /> Am vorbit
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => onAction(reminder.referralId, reminder.id, 'resend')}>
                  <Send className="w-3 h-3" /> Retrimite
                </Button>
                <Button size="sm" variant="ghost" className="text-xs text-gray-500" onClick={() => onAction(reminder.referralId, reminder.id, 'dismiss_reminder')}>
                  Ignoră
                </Button>
              </>
            ) : (
              <>
                <p className="text-xs text-amber-800 font-medium w-full">Ce a zis?</p>
                <Button size="sm" className="gap-1.5 text-xs bg-green-600 hover:bg-green-700" onClick={() => {
                  onAction(reminder.referralId, reminder.id, 'will_access')
                  setShowActions(false)
                }}>
                  <Check className="w-3 h-3" /> Va accesa link-ul
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs text-red-600 border-red-200" onClick={() => {
                  onAction(reminder.referralId, reminder.id, 'not_interested')
                  setShowActions(false)
                }}>
                  <X className="w-3 h-3" /> Nu este interesat
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ReferralRow({ referral, onAction }: { referral: ReferralItem; onAction: (rid: string, remId: string, action: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const statusInfo = STATUS_CONFIG[referral.status] || STATUS_CONFIG.PENDING
  const channelInfo = CHANNEL_CONFIG[referral.channel] || CHANNEL_CONFIG.LINK_ONLY
  const StatusIcon = statusInfo.icon
  const ChannelIcon = channelInfo.icon

  const displayName = referral.referred?.name || referral.referredName || referral.referredEmail || referral.referredPhone || 'Invitație'

  return (
    <div className={`border rounded-xl overflow-hidden ${statusInfo.color.split(' ').slice(1).join(' ')}`}>
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-3 w-full p-3 text-left">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${statusInfo.color.split(' ').slice(0, 2).join(' ')}`}>
          <StatusIcon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <ChannelIcon className={`w-3 h-3 ${channelInfo.color}`} />
            <span>{channelInfo.label}</span>
            <span>•</span>
            <span>{new Date(referral.createdAt).toLocaleDateString('ro-RO')}</span>
            {referral.linkClickCount > 0 && (
              <>
                <span>•</span>
                <span className="text-blue-600">{referral.linkClickCount} click{referral.linkClickCount !== 1 ? '-uri' : ''}</span>
              </>
            )}
          </div>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {referral.referredEmail && <div><span className="text-gray-500">Email:</span> {referral.referredEmail}</div>}
            {referral.referredPhone && <div><span className="text-gray-500">Telefon:</span> {referral.referredPhone}</div>}
            {referral.linkClickedAt && <div><span className="text-gray-500">Link deschis:</span> {new Date(referral.linkClickedAt).toLocaleDateString('ro-RO')}</div>}
            {referral.registeredAt && <div><span className="text-gray-500">Înregistrat:</span> {new Date(referral.registeredAt).toLocaleDateString('ro-RO')}</div>}
            {referral.contactedAt && <div><span className="text-gray-500">Contactat:</span> {new Date(referral.contactedAt).toLocaleDateString('ro-RO')}</div>}
            {referral.contactResult && <div><span className="text-gray-500">Rezultat:</span> {referral.contactResult === 'will_access' ? 'Va accesa' : 'Neinteresat'}</div>}
          </div>
          {referral.notes && <p className="text-xs text-gray-600 italic">{referral.notes}</p>}
          {referral.reminderCount > 0 && <p className="text-[10px] text-gray-400">{referral.reminderCount} remindere trimise</p>}
        </div>
      )}
    </div>
  )
}
