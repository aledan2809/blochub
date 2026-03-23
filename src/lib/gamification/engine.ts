import { db as prisma } from '@/lib/db'

// ─── LEVELS ──────────────────────────────────────
export type Level = 'Incepator' | 'Activ' | 'Avansat' | 'Expert' | 'Master'

const LEVELS: { name: Level; min: number; icon: string }[] = [
  { name: 'Master', min: 850, icon: '🏆' },
  { name: 'Expert', min: 650, icon: '⭐' },
  { name: 'Avansat', min: 450, icon: '🚀' },
  { name: 'Activ', min: 250, icon: '📊' },
  { name: 'Incepator', min: 0, icon: '🏠' },
]

const LEVEL_COLORS: Record<Level, string> = {
  Incepator: '#f59e0b',
  Activ: '#9ca3af',
  Avansat: '#eab308',
  Expert: '#22d3ee',
  Master: '#60a5fa',
}

export function getLevel(score: number): { level: Level; progress: number; icon: string; color: string } {
  for (let i = 0; i < LEVELS.length; i++) {
    if (score >= LEVELS[i].min) {
      const current = LEVELS[i]
      const nextMin = i > 0 ? LEVELS[i - 1].min : 1000
      const progress = Math.round(((score - current.min) / (nextMin - current.min)) * 100)
      return {
        level: current.name,
        progress: Math.min(progress, 100),
        icon: current.icon,
        color: LEVEL_COLORS[current.name],
      }
    }
  }
  return { level: 'Incepator', progress: 0, icon: '🏠', color: LEVEL_COLORS.Incepator }
}

// ─── SETUP STEPS ─────────────────────────────────
export interface SetupStep {
  id: string
  title: string
  description: string
  href: string
  xp: number
  icon: string
  check: (ctx: DataContext) => boolean
}

export const SETUP_STEPS: SetupStep[] = [
  {
    id: 'add_building',
    title: 'Adaugă clădirea',
    description: 'Configurează prima ta clădire cu detalii despre scări și structură',
    href: '/dashboard/cladire',
    xp: 50,
    icon: '🏢',
    check: (ctx) => ctx.buildingCount > 0,
  },
  {
    id: 'add_apartments',
    title: 'Configurează apartamentele',
    description: 'Adaugă apartamentele din clădire cu suprafețe și cote',
    href: '/dashboard/apartamente',
    xp: 50,
    icon: '🏠',
    check: (ctx) => ctx.apartmentCount > 0,
  },
  {
    id: 'add_owners',
    title: 'Adaugă proprietari',
    description: 'Asociază proprietarii cu apartamentele lor',
    href: '/dashboard/proprietari',
    xp: 40,
    icon: '👥',
    check: (ctx) => ctx.ownerCount > 0,
  },
  {
    id: 'add_expense',
    title: 'Înregistrează cheltuieli',
    description: 'Adaugă prima cheltuială a asociației (utilități, întreținere)',
    href: '/dashboard/cheltuieli',
    xp: 40,
    icon: '📋',
    check: (ctx) => ctx.expenseCount > 0,
  },
  {
    id: 'generate_receipt',
    title: 'Generează prima chitanță',
    description: 'Generează chitanțele lunare pentru proprietari',
    href: '/dashboard/chitante/genereaza',
    xp: 60,
    icon: '🧾',
    check: (ctx) => ctx.receiptCount > 0,
  },
  {
    id: 'setup_payments',
    title: 'Configurează plăți online',
    description: 'Activează Stripe pentru a primi plăți de la proprietari',
    href: '/dashboard/setari',
    xp: 50,
    icon: '💳',
    check: (ctx) => ctx.hasStripeKeys,
  },
  {
    id: 'invite_owners',
    title: 'Invită proprietarii',
    description: 'Trimite invitații proprietarilor să acceseze portalul',
    href: '/dashboard/proprietari',
    xp: 60,
    icon: '✉️',
    check: (ctx) => ctx.inviteCount > 0,
  },
  {
    id: 'share_referral',
    title: 'Recomandă BlocX',
    description: 'Trimite codul tău de referral unui alt administrator de bloc',
    href: '/dashboard/referral',
    xp: 30,
    icon: '🤝',
    check: (ctx) => ctx.totalReferralCount > 0,
  },
]

// ─── ACHIEVEMENTS ────────────────────────────────
export interface AchievementDef {
  id: string
  title: string
  description: string
  icon: string
  xp: number
  category: 'setup' | 'administrare' | 'financiar' | 'comunitate' | 'avansat' | 'referral'
  check: (ctx: DataContext) => boolean
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Setup
  { id: 'first_building', title: 'Fundația pusă', description: 'Ai adăugat prima clădire', icon: '🏢', xp: 50, category: 'setup', check: (ctx) => ctx.buildingCount >= 1 },
  { id: 'first_apartment', title: 'Primul apartament', description: 'Ai configurat primul apartament', icon: '🏠', xp: 30, category: 'setup', check: (ctx) => ctx.apartmentCount >= 1 },
  { id: 'setup_complete', title: 'Setup complet', description: 'Ai completat toți pașii din Setup Guide', icon: '✅', xp: 100, category: 'setup', check: (ctx) => ctx.setupStepsCompleted === SETUP_STEPS.length },

  // Administrare
  { id: 'apartments_10', title: 'Bloc mic', description: 'Administrezi 10+ apartamente', icon: '🏘️', xp: 50, category: 'administrare', check: (ctx) => ctx.apartmentCount >= 10 },
  { id: 'apartments_50', title: 'Bloc mare', description: 'Administrezi 50+ apartamente', icon: '🏙️', xp: 100, category: 'administrare', check: (ctx) => ctx.apartmentCount >= 50 },
  { id: 'apartments_100', title: 'Cartier întreg', description: 'Administrezi 100+ apartamente', icon: '🌆', xp: 150, category: 'administrare', check: (ctx) => ctx.apartmentCount >= 100 },
  { id: 'first_ticket', title: 'Prima sesizare', description: 'Ai primit prima sesizare de la un proprietar', icon: '🎫', xp: 30, category: 'administrare', check: (ctx) => ctx.ticketCount >= 1 },
  { id: 'tickets_resolved_10', title: 'Rezolvător', description: 'Ai rezolvat 10 sesizări', icon: '🔧', xp: 60, category: 'administrare', check: (ctx) => ctx.resolvedTicketCount >= 10 },

  // Financiar
  { id: 'first_receipt', title: 'Prima chitanță', description: 'Ai generat prima chitanță', icon: '🧾', xp: 40, category: 'financiar', check: (ctx) => ctx.receiptCount >= 1 },
  { id: 'receipts_100', title: 'Contabil dedicat', description: 'Ai generat 100+ chitanțe', icon: '📊', xp: 80, category: 'financiar', check: (ctx) => ctx.receiptCount >= 100 },
  { id: 'first_payment', title: 'Prima plată online', description: 'Un proprietar a plătit online', icon: '💰', xp: 50, category: 'financiar', check: (ctx) => ctx.onlinePaymentCount >= 1 },
  { id: 'collection_rate_90', title: 'Rata de încasare 90%', description: 'Ai atins rata de încasare de 90%', icon: '📈', xp: 100, category: 'financiar', check: (ctx) => ctx.collectionRate >= 90 },
  { id: 'zero_arrears', title: 'Zero restanțe', description: 'Niciun apartament cu restanțe luna asta', icon: '🎯', xp: 120, category: 'financiar', check: (ctx) => ctx.arrearsCount === 0 && ctx.receiptCount > 0 },

  // Comunitate
  { id: 'first_invite', title: 'Prima invitație', description: 'Ai invitat primul proprietar pe platformă', icon: '✉️', xp: 30, category: 'comunitate', check: (ctx) => ctx.inviteCount >= 1 },
  { id: 'invites_10', title: 'Comunitate activă', description: '10+ proprietari invitați', icon: '👨‍👩‍👧‍👦', xp: 60, category: 'comunitate', check: (ctx) => ctx.inviteCount >= 10 },
  { id: 'first_announcement', title: 'Primul anunț', description: 'Ai postat primul anunț pe avizier', icon: '📢', xp: 30, category: 'comunitate', check: (ctx) => ctx.announcementCount >= 1 },
  { id: 'active_portal', title: 'Portal activ', description: '5+ proprietari au accesat portalul', icon: '🌐', xp: 80, category: 'comunitate', check: (ctx) => ctx.portalUsersCount >= 5 },

  // Avansat
  { id: 'ocr_used', title: 'AI la putere', description: 'Ai folosit OCR pentru scanarea unei facturi', icon: '🤖', xp: 50, category: 'avansat', check: (ctx) => ctx.ocrUsedCount >= 1 },
  { id: 'import_done', title: 'Import reușit', description: 'Ai importat date din Excel', icon: '📥', xp: 40, category: 'avansat', check: (ctx) => ctx.importCount >= 1 },
  { id: 'full_year', title: 'Un an complet', description: 'Ai chitanțe generate pentru 12 luni consecutive', icon: '🗓️', xp: 150, category: 'avansat', check: (ctx) => ctx.consecutiveMonths >= 12 },

  // Referral
  { id: 'first_referral', title: 'Prima recomandare', description: 'Ai adus prima asociație nouă pe BlocX', icon: '🤝', xp: 80, category: 'referral', check: (ctx) => ctx.activeReferralCount >= 1 },
  { id: 'referrals_5', title: 'Influencer local', description: 'Ai adus 5 asociații noi pe BlocX', icon: '📣', xp: 150, category: 'referral', check: (ctx) => ctx.activeReferralCount >= 5 },
  { id: 'referral_ambassador', title: 'Ambasador BlocX', description: 'Ai adus 10 asociații — ești ambasador oficial!', icon: '🏅', xp: 250, category: 'referral', check: (ctx) => ctx.activeReferralCount >= 10 },
  { id: 'referral_streak', title: 'Streak de referral-uri', description: '3 referral-uri active în aceeași lună', icon: '🔥', xp: 100, category: 'referral', check: (ctx) => ctx.referralMonthStreak >= 3 },
]

// ─── DATA CONTEXT ────────────────────────────────
export interface DataContext {
  buildingCount: number
  apartmentCount: number
  ownerCount: number
  expenseCount: number
  receiptCount: number
  hasStripeKeys: boolean
  inviteCount: number
  ticketCount: number
  resolvedTicketCount: number
  onlinePaymentCount: number
  collectionRate: number
  arrearsCount: number
  announcementCount: number
  portalUsersCount: number
  ocrUsedCount: number
  importCount: number
  consecutiveMonths: number
  setupStepsCompleted: number
  // Referral
  totalReferralCount: number
  activeReferralCount: number
  referralMonthStreak: number
}

export async function buildDataContext(userId: string, asociatieId: string): Promise<DataContext> {
  const [
    buildingCount,
    apartmentCount,
    ownerCount,
    expenseCount,
    receiptCount,
    platformSettings,
    inviteCount,
    ticketCount,
    resolvedTicketCount,
    onlinePaymentCount,
    arrearsCount,
    announcementCount,
    portalUsersCount,
    ocrUsedCount,
    importCount,
    receiptMonths,
    totalReferralCount,
    activeReferralCount,
    activeReferrals,
  ] = await Promise.all([
    prisma.cladire.count({ where: { asociatieId } }),
    prisma.apartament.count({ where: { asociatieId } }),
    prisma.proprietarApartament.count({ where: { apartament: { asociatieId }, esteActiv: true } }),
    prisma.cheltuiala.count({ where: { asociatieId } }),
    prisma.chitanta.count({ where: { asociatieId } }),
    prisma.platformSettings.findFirst({ where: { id: 'default' } }),
    prisma.invitationToken.count({ where: { asociatieId } }),
    prisma.tichet.count({ where: { asociatieId } }),
    prisma.tichet.count({ where: { asociatieId, status: 'REZOLVAT' } }),
    prisma.plata.count({ where: { chitanta: { asociatieId }, metodaPlata: 'CARD' } }),
    prisma.chitanta.count({ where: { asociatieId, status: 'RESTANTA' } }),
    prisma.anunt.count({ where: { asociatieId } }),
    prisma.user.count({
      where: {
        role: 'PROPRIETAR',
        apartamente: { some: { apartament: { asociatieId } } },
        lastLoginAt: { not: null },
      },
    }),
    prisma.cheltuiala.count({ where: { asociatieId, ocrExtracted: true } }),
    prisma.importSession.count({ where: { asociatieId, status: 'COMPLETED' } }),
    prisma.chitanta.findMany({
      where: { asociatieId },
      select: { luna: true, an: true },
      distinct: ['luna', 'an'],
      orderBy: [{ an: 'desc' }, { luna: 'desc' }],
    }),
    // Referral counts
    prisma.referral.count({ where: { referrerId: userId } }),
    prisma.referral.count({ where: { referrerId: userId, status: { in: ['ACTIVE', 'REWARDED'] } } }),
    prisma.referral.findMany({
      where: {
        referrerId: userId,
        status: { in: ['ACTIVE', 'REWARDED'] },
        activatedAt: { not: null },
      },
      select: { activatedAt: true },
    }),
  ])

  const hasStripeKeys = !!(platformSettings?.stripeSecretKey && platformSettings?.stripePublishableKey)

  // Calculate collection rate
  const totalReceipts = await prisma.chitanta.count({ where: { asociatieId } })
  const paidReceipts = await prisma.chitanta.count({ where: { asociatieId, status: { in: ['PLATITA', 'PARTIAL_PLATITA'] } } })
  const collectionRate = totalReceipts > 0 ? Math.round((paidReceipts / totalReceipts) * 100) : 0

  // Calculate consecutive months
  let consecutiveMonths = 0
  if (receiptMonths.length > 0) {
    consecutiveMonths = 1
    for (let i = 1; i < receiptMonths.length; i++) {
      const prev = receiptMonths[i - 1]
      const curr = receiptMonths[i]
      const prevTotal = prev.an * 12 + prev.luna
      const currTotal = curr.an * 12 + curr.luna
      if (prevTotal - currTotal === 1) {
        consecutiveMonths++
      } else {
        break
      }
    }
  }

  // Calculate referral month streak (how many active referrals in the current month)
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const referralMonthStreak = activeReferrals.filter((r) => {
    if (!r.activatedAt) return false
    return r.activatedAt.getMonth() === currentMonth && r.activatedAt.getFullYear() === currentYear
  }).length

  // Count completed setup steps
  const ctx: DataContext = {
    buildingCount,
    apartmentCount,
    ownerCount,
    expenseCount,
    receiptCount,
    hasStripeKeys,
    inviteCount,
    ticketCount,
    resolvedTicketCount,
    onlinePaymentCount,
    collectionRate,
    arrearsCount,
    announcementCount,
    portalUsersCount,
    ocrUsedCount,
    importCount,
    consecutiveMonths,
    setupStepsCompleted: 0,
    totalReferralCount,
    activeReferralCount,
    referralMonthStreak,
  }

  ctx.setupStepsCompleted = SETUP_STEPS.filter((s) => s.check(ctx)).length

  return ctx
}

// ─── PILLARS ─────────────────────────────────────
export interface Pillar {
  id: string
  name: string
  score: number
  maxScore: number
  icon: string
}

function calculatePillars(ctx: DataContext): Pillar[] {
  // 5 pillars, 200 max each = 1000 total
  return [
    {
      id: 'setup',
      name: 'Configurare',
      icon: '⚙️',
      maxScore: 200,
      score: Math.min(200, Math.round((ctx.setupStepsCompleted / SETUP_STEPS.length) * 200)),
    },
    {
      id: 'administrare',
      name: 'Administrare',
      icon: '🏢',
      maxScore: 200,
      score: Math.min(200,
        (ctx.buildingCount > 0 ? 40 : 0) +
        Math.min(80, ctx.apartmentCount * 2) +
        Math.min(40, ctx.ownerCount * 4) +
        (ctx.ticketCount > 0 ? 20 : 0) +
        Math.min(20, ctx.resolvedTicketCount * 2)
      ),
    },
    {
      id: 'financiar',
      name: 'Financiar',
      icon: '💰',
      maxScore: 200,
      score: Math.min(200,
        Math.min(60, ctx.expenseCount * 5) +
        Math.min(60, ctx.receiptCount * 2) +
        (ctx.onlinePaymentCount > 0 ? 40 : 0) +
        Math.min(40, Math.round(ctx.collectionRate * 0.4))
      ),
    },
    {
      id: 'comunitate',
      name: 'Comunitate',
      icon: '👥',
      maxScore: 200,
      score: Math.min(200,
        Math.min(40, ctx.inviteCount * 4) +
        Math.min(40, ctx.portalUsersCount * 8) +
        Math.min(30, ctx.announcementCount * 10) +
        (ctx.ticketCount > 0 ? 30 : 0) +
        Math.min(60, ctx.activeReferralCount * 12)
      ),
    },
    {
      id: 'avansat',
      name: 'Funcții avansate',
      icon: '🤖',
      maxScore: 200,
      score: Math.min(200,
        (ctx.ocrUsedCount > 0 ? 50 : 0) +
        (ctx.importCount > 0 ? 50 : 0) +
        (ctx.hasStripeKeys ? 50 : 0) +
        Math.min(50, ctx.consecutiveMonths * 5)
      ),
    },
  ]
}

// ─── MAIN CALCULATION ────────────────────────────
export interface GamificationResult {
  totalScore: number
  maxScore: number
  level: Level
  levelProgress: number
  levelIcon: string
  levelColor: string
  pillars: Pillar[]
  achievements: Array<AchievementDef & { earned: boolean; earnedAt?: string }>
  setupSteps: Array<SetupStep & { completed: boolean }>
  setupProgress: number
  newAchievements: string[]
  tips: string[]
}

export async function calculateGamification(userId: string, asociatieId: string): Promise<GamificationResult> {
  const ctx = await buildDataContext(userId, asociatieId)
  const pillars = calculatePillars(ctx)
  const totalScore = pillars.reduce((s, p) => s + p.score, 0)
  const { level, progress, icon, color } = getLevel(totalScore)

  // Check achievements
  const existingAchievements = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true, earnedAt: true },
  })
  const existingMap = new Map(existingAchievements.map((a) => [a.achievementId, a.earnedAt]))

  const newAchievementIds: string[] = []

  const achievementsWithStatus = ACHIEVEMENTS.map((def) => {
    const earned = existingMap.has(def.id)
    const justEarned = !earned && def.check(ctx)

    if (justEarned) {
      newAchievementIds.push(def.id)
    }

    return {
      ...def,
      earned: earned || justEarned,
      earnedAt: earned ? existingMap.get(def.id)?.toISOString() : justEarned ? new Date().toISOString() : undefined,
    }
  })

  // Persist new achievements
  if (newAchievementIds.length > 0) {
    await prisma.userAchievement.createMany({
      data: newAchievementIds.map((id) => ({
        userId,
        achievementId: id,
        xpEarned: ACHIEVEMENTS.find((a) => a.id === id)?.xp ?? 0,
      })),
      skipDuplicates: true,
    })
  }

  // Setup steps with completion status
  const setupSteps = SETUP_STEPS.map((step) => ({
    ...step,
    completed: step.check(ctx),
  }))

  const setupProgress = Math.round((setupSteps.filter((s) => s.completed).length / setupSteps.length) * 100)

  // Tips
  const tips: string[] = []
  if (ctx.buildingCount === 0) tips.push('Adaugă prima clădire pentru a începe administrarea.')
  else if (ctx.apartmentCount === 0) tips.push('Configurează apartamentele clădirii tale.')
  else if (ctx.ownerCount === 0) tips.push('Adaugă proprietarii apartamentelor.')
  else if (ctx.expenseCount === 0) tips.push('Înregistrează prima cheltuială a asociației.')
  else if (ctx.receiptCount === 0) tips.push('Generează primele chitanțe pentru proprietari.')
  else if (!ctx.hasStripeKeys) tips.push('Activează plățile online cu Stripe.')
  else if (ctx.inviteCount === 0) tips.push('Invită proprietarii pe platformă.')
  if (ctx.ocrUsedCount === 0 && ctx.expenseCount > 3) tips.push('Încearcă scanarea facturilor cu AI OCR.')
  if (ctx.announcementCount === 0 && ctx.ownerCount > 0) tips.push('Postează un anunț pe avizierul digital.')
  if (ctx.activeReferralCount === 0) tips.push('Recomandă BlocX unui alt administrator și câștigă XP bonus!')
  if (ctx.activeReferralCount > 0 && ctx.activeReferralCount < 5) tips.push(`Ai ${ctx.activeReferralCount} referral-uri active — mai ai nevoie de ${5 - ctx.activeReferralCount} pentru badge-ul "Influencer local"!`)

  // Save snapshot (max once per hour)
  const lastSnapshot = await prisma.gamificationSnapshot.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  if (!lastSnapshot || lastSnapshot.createdAt < oneHourAgo) {
    await prisma.gamificationSnapshot.create({
      data: {
        userId,
        totalScore,
        level,
        pillars: JSON.stringify(Object.fromEntries(pillars.map((p) => [p.id, p.score]))),
        earnedCount: achievementsWithStatus.filter((a) => a.earned).length,
      },
    }).catch(() => {}) // non-critical
  }

  return {
    totalScore,
    maxScore: 1000,
    level,
    levelProgress: progress,
    levelIcon: icon,
    levelColor: color,
    pillars,
    achievements: achievementsWithStatus,
    setupSteps,
    setupProgress,
    newAchievements: newAchievementIds,
    tips,
  }
}
