import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db as prisma } from '@/lib/db'

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I, O, 0, 1
  let code = 'BLOCX-'
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// GET — Get current user's referral info
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, referredByCode: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilizator negăsit' }, { status: 404 })
    }

    // Auto-generate referral code if missing
    if (!user.referralCode) {
      let code = generateReferralCode()
      // Ensure uniqueness
      let exists = await prisma.user.findUnique({ where: { referralCode: code } })
      while (exists) {
        code = generateReferralCode()
        exists = await prisma.user.findUnique({ where: { referralCode: code } })
      }
      await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
      })
      user = { ...user, referralCode: code }
    }

    // Get referrals
    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      select: {
        id: true,
        referredEmail: true,
        status: true,
        rewardType: true,
        rewardAmount: true,
        createdAt: true,
        registeredAt: true,
        activatedAt: true,
        referred: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Stats
    const stats = {
      total: referrals.length,
      pending: referrals.filter((r) => r.status === 'PENDING').length,
      registered: referrals.filter((r) => r.status === 'REGISTERED').length,
      active: referrals.filter((r) => r.status === 'ACTIVE' || r.status === 'REWARDED').length,
      totalXpEarned: referrals
        .filter((r) => r.status === 'ACTIVE' || r.status === 'REWARDED')
        .reduce((sum, r) => sum + (r.rewardAmount ?? 0), 0),
    }

    return NextResponse.json({
      referralCode: user.referralCode,
      referralLink: `${process.env.NEXTAUTH_URL || 'https://blocx.ro'}/auth/register?ref=${user.referralCode}`,
      referredByCode: user.referredByCode,
      referrals,
      stats,
    })
  } catch (error) {
    console.error('Referral GET error:', error)
    return NextResponse.json({ error: 'Eroare la încărcarea referral-urilor' }, { status: 500 })
  }
}

// POST — Create a referral (share with email)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    const body = await req.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email necesar' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Check if already referred this email
    const existing = await prisma.referral.findFirst({
      where: { referrerId: userId, referredEmail: normalizedEmail },
    })
    if (existing) {
      return NextResponse.json({ error: 'Ai trimis deja o invitație la această adresă' }, { status: 409 })
    }

    // Check user isn't referring themselves
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, referralCode: true },
    })
    if (user?.email?.toLowerCase() === normalizedEmail) {
      return NextResponse.json({ error: 'Nu te poți referi pe tine' }, { status: 400 })
    }

    // Create referral record
    const referral = await prisma.referral.create({
      data: {
        referrerId: userId,
        referralCode: user!.referralCode!,
        referredEmail: normalizedEmail,
        status: 'PENDING',
      },
    })

    // TODO: Send referral email via email service

    return NextResponse.json({
      success: true,
      referral: {
        id: referral.id,
        email: normalizedEmail,
        status: referral.status,
      },
    })
  } catch (error) {
    console.error('Referral POST error:', error)
    return NextResponse.json({ error: 'Eroare la crearea referral-ului' }, { status: 500 })
  }
}
