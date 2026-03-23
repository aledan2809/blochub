import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db as prisma } from '@/lib/db'

// XP rewards by channel (higher for personal channels, lower for email/spam-prone)
const CHANNEL_XP: Record<string, number> = {
  WHATSAPP: 100,  // Personal, high open rate
  SMS: 80,        // Direct, but costs money
  EMAIL: 50,      // Can land in spam
  LINK_ONLY: 30,  // Just shared the link
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'BLOCX-'
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

async function ensureReferralCode(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true, email: true, name: true },
  })
  if (!user) return null

  if (!user.referralCode) {
    let code = generateReferralCode()
    let exists = await prisma.user.findUnique({ where: { referralCode: code } })
    while (exists) {
      code = generateReferralCode()
      exists = await prisma.user.findUnique({ where: { referralCode: code } })
    }
    await prisma.user.update({ where: { id: userId }, data: { referralCode: code } })
    return { ...user, referralCode: code }
  }
  return user
}

// ─── GET — Referral dashboard data ───────────────
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    const user = await ensureReferralCode(userId)
    if (!user) {
      return NextResponse.json({ error: 'Utilizator negăsit' }, { status: 404 })
    }

    // Get referrals with reminders
    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      include: {
        referred: { select: { name: true } },
        reminders: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Generate reminders for pending referrals
    const activeReminders = []
    const now = new Date()

    for (const ref of referrals) {
      if (ref.status !== 'PENDING' && ref.status !== 'LINK_OPENED') continue

      const daysSinceSent = Math.floor((now.getTime() - ref.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      const daysSinceLastReminder = ref.lastReminderAt
        ? Math.floor((now.getTime() - ref.lastReminderAt.getTime()) / (1000 * 60 * 60 * 24))
        : daysSinceSent

      // Reminder logic
      let reminderMessage = ''
      let reminderType = ''

      if (ref.status === 'PENDING' && daysSinceSent >= 3 && daysSinceLastReminder >= 3) {
        if (ref.contactedAt) {
          // Already spoke but no action yet
          if (ref.contactResult === 'will_access') {
            reminderMessage = `${ref.referredName || ref.referredEmail || ref.referredPhone} a spus că va accesa link-ul, dar încă nu a făcut-o. Poate un mesaj scurt de reamintire ar ajuta.`
            reminderType = 'follow_up'
          }
        } else if (daysSinceSent <= 7) {
          reminderMessage = `Ai trimis invitație ${ref.channel === 'EMAIL' ? 'pe email' : ref.channel === 'WHATSAPP' ? 'pe WhatsApp' : ref.channel === 'SMS' ? 'prin SMS' : ''} lui ${ref.referredName || ref.referredEmail || ref.referredPhone}, dar încă nu a deschis link-ul. Poate că a fost ocupat(ă) sau îi e teamă să-l acceseze. Ar fi bine să-l/o suni.`
          reminderType = 'no_click'
        } else {
          reminderMessage = `Au trecut ${daysSinceSent} zile de când ai trimis invitația lui ${ref.referredName || ref.referredEmail || ref.referredPhone}. Un telefon scurt poate face diferența.`
          reminderType = 'no_click'
        }
      } else if (ref.status === 'LINK_OPENED' && daysSinceLastReminder >= 2) {
        reminderMessage = `${ref.referredName || 'Persoana invitată'} a deschis link-ul dar nu s-a înregistrat încă. Sună-l/o să-i oferi suport.`
        reminderType = 'no_register'
      }

      if (reminderMessage) {
        // Check if this exact reminder was already shown
        const existingReminder = ref.reminders.find(
          (r) => r.type === reminderType && !r.dismissedAt
        )
        if (!existingReminder) {
          const reminder = await prisma.referralReminder.create({
            data: {
              referralId: ref.id,
              type: reminderType,
              message: reminderMessage,
            },
          })
          await prisma.referral.update({
            where: { id: ref.id },
            data: { lastReminderAt: now, reminderCount: { increment: 1 } },
          })
          activeReminders.push({
            id: reminder.id,
            referralId: ref.id,
            referredName: ref.referredName || ref.referredEmail || ref.referredPhone,
            type: reminderType,
            message: reminderMessage,
            channel: ref.channel,
          })
        } else {
          activeReminders.push({
            id: existingReminder.id,
            referralId: ref.id,
            referredName: ref.referredName || ref.referredEmail || ref.referredPhone,
            type: existingReminder.type,
            message: existingReminder.message,
            channel: ref.channel,
          })
        }
      }
    }

    // Stats
    const stats = {
      total: referrals.length,
      pending: referrals.filter((r) => r.status === 'PENDING').length,
      linkOpened: referrals.filter((r) => r.status === 'LINK_OPENED').length,
      registered: referrals.filter((r) => r.status === 'REGISTERED').length,
      active: referrals.filter((r) => r.status === 'ACTIVE' || r.status === 'REWARDED').length,
      notInterested: referrals.filter((r) => r.status === 'NOT_INTERESTED').length,
      byChannel: {
        email: referrals.filter((r) => r.channel === 'EMAIL').length,
        whatsapp: referrals.filter((r) => r.channel === 'WHATSAPP').length,
        sms: referrals.filter((r) => r.channel === 'SMS').length,
        link: referrals.filter((r) => r.channel === 'LINK_ONLY').length,
      },
      totalXpEarned: referrals
        .filter((r) => r.status === 'ACTIVE' || r.status === 'REWARDED')
        .reduce((sum, r) => sum + (r.rewardAmount ?? 0), 0),
    }

    return NextResponse.json({
      referralCode: user.referralCode,
      referralLink: `${process.env.NEXTAUTH_URL || 'https://blocx.ro'}/auth/register?ref=${user.referralCode}`,
      referrals: referrals.map((r) => ({
        id: r.id,
        referredName: r.referredName,
        referredEmail: r.referredEmail,
        referredPhone: r.referredPhone,
        channel: r.channel,
        status: r.status,
        linkClickCount: r.linkClickCount,
        linkClickedAt: r.linkClickedAt,
        contactedAt: r.contactedAt,
        contactResult: r.contactResult,
        notes: r.notes,
        rewardAmount: r.rewardAmount,
        reminderCount: r.reminderCount,
        createdAt: r.createdAt,
        registeredAt: r.registeredAt,
        activatedAt: r.activatedAt,
        referred: r.referred,
      })),
      activeReminders,
      stats,
      channelXP: CHANNEL_XP,
    })
  } catch (error) {
    console.error('Referral GET error:', error)
    return NextResponse.json({ error: 'Eroare la încărcarea referral-urilor' }, { status: 500 })
  }
}

// ─── POST — Send referral via channel ────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    const body = await req.json()
    const { channel, email, phone, name } = body as {
      channel: 'EMAIL' | 'WHATSAPP' | 'SMS' | 'LINK_ONLY'
      email?: string
      phone?: string
      name?: string
    }

    if (!channel) {
      return NextResponse.json({ error: 'Canal necesar' }, { status: 400 })
    }

    // Validate based on channel
    if (channel === 'EMAIL' && (!email || typeof email !== 'string')) {
      return NextResponse.json({ error: 'Email necesar pentru canal email' }, { status: 400 })
    }
    if ((channel === 'WHATSAPP' || channel === 'SMS') && (!phone || typeof phone !== 'string')) {
      return NextResponse.json({ error: 'Număr de telefon necesar' }, { status: 400 })
    }

    const normalizedEmail = email?.trim().toLowerCase() || null
    const normalizedPhone = phone?.trim() || null

    // Check duplicate
    const duplicateWhere = normalizedEmail
      ? { referrerId: userId, referredEmail: normalizedEmail }
      : normalizedPhone
        ? { referrerId: userId, referredPhone: normalizedPhone }
        : null

    if (duplicateWhere) {
      const existing = await prisma.referral.findFirst({ where: duplicateWhere })
      if (existing) {
        return NextResponse.json({ error: 'Ai trimis deja o invitație la această adresă/număr' }, { status: 409 })
      }
    }

    // Self-referral check
    const user = await ensureReferralCode(userId)
    if (!user) {
      return NextResponse.json({ error: 'Utilizator negăsit' }, { status: 404 })
    }
    if (normalizedEmail && user.email?.toLowerCase() === normalizedEmail) {
      return NextResponse.json({ error: 'Nu te poți referi pe tine' }, { status: 400 })
    }

    // Create referral
    const referral = await prisma.referral.create({
      data: {
        referrerId: userId,
        referralCode: user.referralCode!,
        referredEmail: normalizedEmail,
        referredPhone: normalizedPhone,
        referredName: name?.trim() || null,
        channel,
        status: 'PENDING',
      },
    })

    // Send via channel
    const referralLink = `${process.env.NEXTAUTH_URL || 'https://blocx.ro'}/auth/register?ref=${user.referralCode}`

    if (channel === 'EMAIL' && normalizedEmail) {
      // TODO: integrate with email service (nodemailer/resend)
      // await sendReferralEmail(normalizedEmail, user.name, referralLink)
      console.log(`[Referral] Email to ${normalizedEmail}: ${referralLink}`)
    } else if (channel === 'WHATSAPP' && normalizedPhone) {
      // TODO: integrate with @aledan/whatsapp
      // const wa = new WhatsAppClient({ ... })
      // await wa.sendTemplate(normalizedPhone, 'referral_invite', 'ro', [...])
      console.log(`[Referral] WhatsApp to ${normalizedPhone}: ${referralLink}`)
    } else if (channel === 'SMS' && normalizedPhone) {
      // TODO: integrate with @aledan/sms
      // const sms = new SMSClient({ ... })
      // await sms.send({ to: normalizedPhone, message: `...${referralLink}` })
      console.log(`[Referral] SMS to ${normalizedPhone}: ${referralLink}`)
    }

    return NextResponse.json({
      success: true,
      referral: {
        id: referral.id,
        channel,
        status: referral.status,
        xpReward: CHANNEL_XP[channel],
      },
    })
  } catch (error) {
    console.error('Referral POST error:', error)
    return NextResponse.json({ error: 'Eroare la crearea referral-ului' }, { status: 500 })
  }
}

// ─── PATCH — Update referral CRM status ──────────
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    const body = await req.json()
    const { referralId, action, notes, reminderId } = body as {
      referralId: string
      action: 'contacted' | 'will_access' | 'not_interested' | 'resend' | 'dismiss_reminder'
      notes?: string
      reminderId?: string
    }

    // Verify ownership
    const referral = await prisma.referral.findFirst({
      where: { id: referralId, referrerId: userId },
    })
    if (!referral) {
      return NextResponse.json({ error: 'Referral negăsit' }, { status: 404 })
    }

    if (action === 'contacted') {
      await prisma.referral.update({
        where: { id: referralId },
        data: {
          contactedAt: new Date(),
          notes: notes || referral.notes,
        },
      })
    } else if (action === 'will_access') {
      await prisma.referral.update({
        where: { id: referralId },
        data: { contactResult: 'will_access', notes: notes || referral.notes },
      })
      // Dismiss active reminder
      if (reminderId) {
        await prisma.referralReminder.update({
          where: { id: reminderId },
          data: { dismissedAt: new Date(), actionTaken: 'will_access' },
        })
      }
    } else if (action === 'not_interested') {
      await prisma.referral.update({
        where: { id: referralId },
        data: {
          status: 'NOT_INTERESTED',
          contactResult: 'not_interested',
          notes: notes || referral.notes,
        },
      })
      if (reminderId) {
        await prisma.referralReminder.update({
          where: { id: reminderId },
          data: { dismissedAt: new Date(), actionTaken: 'not_interested' },
        })
      }
    } else if (action === 'dismiss_reminder' && reminderId) {
      await prisma.referralReminder.update({
        where: { id: reminderId },
        data: { dismissedAt: new Date(), actionTaken: 'dismissed' },
      })
    } else if (action === 'resend') {
      // Re-send the referral via original channel
      const referralLink = `${process.env.NEXTAUTH_URL || 'https://blocx.ro'}/auth/register?ref=${referral.referralCode}`
      console.log(`[Referral] Resend via ${referral.channel} to ${referral.referredEmail || referral.referredPhone}: ${referralLink}`)
      // TODO: actual resend logic per channel
      if (reminderId) {
        await prisma.referralReminder.update({
          where: { id: reminderId },
          data: { dismissedAt: new Date(), actionTaken: 'resend' },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Referral PATCH error:', error)
    return NextResponse.json({ error: 'Eroare la actualizare' }, { status: 500 })
  }
}
