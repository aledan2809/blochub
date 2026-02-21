/**
 * Subscription Context & Permission Checking
 *
 * This module provides utilities for checking subscription status,
 * feature access, and usage limits for organizations.
 */

import { db } from './db'
import {
  Feature,
  ModuleCode,
  MODULE_FEATURES,
  PlanLimits,
  isUnlimited,
} from './features'

// ============================================
// TYPES
// ============================================

export interface SubscriptionContext {
  organizatieId: string
  planCod: string
  planNume: string
  status: string
  features: Feature[]
  limits: {
    apartamente: { current: number; max: number }
    asociatii: { current: number; max: number }
    utilizatori: { current: number; max: number }
    storageMB: { current: number; max: number }
    aiRequests: { current: number; max: number }
    emailsPerMonth: { current: number; max: number }
  }
  readOnlyModules: ModuleCode[]
  trialEndsAt: Date | null
  isTrialExpired: boolean
  isInGracePeriod: boolean
  gracePeriodEndsAt: Date | null
}

export interface FeatureCheckResult {
  allowed: boolean
  reason?: 'not_subscribed' | 'feature_not_available' | 'read_only' | 'suspended' | 'limit_exceeded'
  isReadOnly?: boolean
  upgradeRequired?: boolean
}

export interface LimitCheckResult {
  allowed: boolean
  current: number
  max: number
  percentage: number
  remaining: number
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Get full subscription context for an organization
 */
export async function getSubscriptionContext(
  organizatieId: string
): Promise<SubscriptionContext | null> {
  const abonament = await db.abonament.findUnique({
    where: { organizatieId },
    include: {
      plan: {
        include: { moduleIncluse: true },
      },
      organizatie: {
        include: {
          asociatii: { select: { id: true } },
          utilizatori: { where: { esteActiv: true }, select: { id: true } },
        },
      },
    },
  })

  if (!abonament) return null

  // Get platform settings for grace period check
  const settings = await db.platformSettings.findUnique({
    where: { id: 'default' },
  })

  const graceDays = settings?.graceDays || 7
  const now = new Date()

  // Calculate trial status
  const trialEndsAt = abonament.perioadaTrial
  const isTrialExpired = trialEndsAt ? now > trialEndsAt : false

  // Calculate grace period
  let isInGracePeriod = false
  let gracePeriodEndsAt: Date | null = null

  if (abonament.status === 'EXPIRAT' && abonament.dataExpirare) {
    gracePeriodEndsAt = new Date(abonament.dataExpirare)
    gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + graceDays)
    isInGracePeriod = now <= gracePeriodEndsAt
  }

  // Get all features from modules
  const features = abonament.plan.moduleIncluse.flatMap((m) =>
    JSON.parse(m.featuresJson) as Feature[]
  )

  // Parse limits
  const limits = JSON.parse(abonament.plan.limiteJson) as PlanLimits
  const customLimits = abonament.limiteCustomJson
    ? (JSON.parse(abonament.limiteCustomJson) as Partial<PlanLimits>)
    : {}

  // Merge custom limits over plan limits
  const effectiveLimits = { ...limits, ...customLimits }

  // Count current usage
  const [apartamenteCount, emailsThisMonth, aiRequestsThisMonth] = await Promise.all([
    db.apartament.count({
      where: { asociatie: { organizatieId } },
    }),
    db.usageLog.count({
      where: {
        organizatieId,
        tipResursa: 'EMAIL_SENT',
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), 1),
        },
      },
    }),
    db.usageLog.count({
      where: {
        organizatieId,
        tipResursa: 'AI_REQUEST',
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), 1),
        },
      },
    }),
  ])

  // Parse read-only modules
  const readOnlyModules = (abonament.readOnlyModules || []) as ModuleCode[]

  return {
    organizatieId,
    planCod: abonament.plan.cod,
    planNume: abonament.plan.nume,
    status: abonament.status,
    features,
    limits: {
      apartamente: {
        current: apartamenteCount,
        max: effectiveLimits.apartamente,
      },
      asociatii: {
        current: abonament.organizatie.asociatii.length,
        max: effectiveLimits.asociatii,
      },
      utilizatori: {
        current: abonament.organizatie.utilizatori.length,
        max: effectiveLimits.utilizatori,
      },
      storageMB: {
        current: 0, // TODO: Calculate from documents
        max: effectiveLimits.storageMB,
      },
      aiRequests: {
        current: aiRequestsThisMonth,
        max: effectiveLimits.aiRequests,
      },
      emailsPerMonth: {
        current: emailsThisMonth,
        max: effectiveLimits.emailsPerMonth,
      },
    },
    readOnlyModules,
    trialEndsAt,
    isTrialExpired,
    isInGracePeriod,
    gracePeriodEndsAt,
  }
}

/**
 * Check if an organization has access to a specific feature
 */
export async function hasFeature(
  organizatieId: string,
  feature: Feature
): Promise<FeatureCheckResult> {
  const context = await getSubscriptionContext(organizatieId)

  if (!context) {
    return {
      allowed: false,
      reason: 'not_subscribed',
      upgradeRequired: true,
    }
  }

  // Check if suspended
  if (context.status === 'SUSPENDAT') {
    return {
      allowed: false,
      reason: 'suspended',
      upgradeRequired: true,
    }
  }

  // Check if in trial but expired
  if (context.status === 'TRIAL' && context.isTrialExpired) {
    return {
      allowed: false,
      reason: 'suspended',
      upgradeRequired: true,
    }
  }

  // Check if feature is in read-only module
  const isReadOnly = context.readOnlyModules.some((moduleCode) =>
    MODULE_FEATURES[moduleCode]?.includes(feature)
  )

  if (isReadOnly) {
    return {
      allowed: true,
      reason: 'read_only',
      isReadOnly: true,
    }
  }

  // Check if feature is available
  if (!context.features.includes(feature)) {
    return {
      allowed: false,
      reason: 'feature_not_available',
      upgradeRequired: true,
    }
  }

  return { allowed: true }
}

/**
 * Check if an organization is within a specific limit
 */
export async function checkLimit(
  organizatieId: string,
  limitType: keyof SubscriptionContext['limits']
): Promise<LimitCheckResult> {
  const context = await getSubscriptionContext(organizatieId)

  if (!context) {
    return {
      allowed: false,
      current: 0,
      max: 0,
      percentage: 100,
      remaining: 0,
    }
  }

  const limit = context.limits[limitType]

  // Unlimited
  if (isUnlimited(limit.max)) {
    return {
      allowed: true,
      current: limit.current,
      max: limit.max,
      percentage: 0,
      remaining: Infinity,
    }
  }

  const percentage = Math.round((limit.current / limit.max) * 100)
  const remaining = Math.max(0, limit.max - limit.current)

  return {
    allowed: limit.current < limit.max,
    current: limit.current,
    max: limit.max,
    percentage,
    remaining,
  }
}

/**
 * Check if organization can add more of a resource
 */
export async function canAdd(
  organizatieId: string,
  resourceType: 'apartament' | 'asociatie' | 'utilizator'
): Promise<boolean> {
  const limitMap: Record<string, keyof SubscriptionContext['limits']> = {
    apartament: 'apartamente',
    asociatie: 'asociatii',
    utilizator: 'utilizatori',
  }

  const result = await checkLimit(organizatieId, limitMap[resourceType])
  return result.allowed
}

/**
 * Log usage of a resource
 */
export async function logUsage(
  organizatieId: string,
  tipResursa: 'AI_REQUEST' | 'EMAIL_SENT' | 'DOCUMENT_UPLOAD' | 'API_CALL',
  options?: {
    cantitate?: number
    asociatieId?: string
    userId?: string
    detalii?: Record<string, unknown>
  }
): Promise<void> {
  await db.usageLog.create({
    data: {
      organizatieId,
      tipResursa,
      cantitate: options?.cantitate || 1,
      asociatieId: options?.asociatieId,
      userId: options?.userId,
      detalii: options?.detalii ? JSON.stringify(options.detalii) : null,
    },
  })
}

/**
 * Check if organization can use a resource (within limits)
 */
export async function canUseResource(
  organizatieId: string,
  resourceType: 'AI_REQUEST' | 'EMAIL_SENT'
): Promise<boolean> {
  const limitMap: Record<string, keyof SubscriptionContext['limits']> = {
    AI_REQUEST: 'aiRequests',
    EMAIL_SENT: 'emailsPerMonth',
  }

  const result = await checkLimit(organizatieId, limitMap[resourceType])
  return result.allowed
}

// ============================================
// ORGANIZATION HELPERS
// ============================================

/**
 * Get organization ID from association ID
 */
export async function getOrganizatieFromAsociatie(
  asociatieId: string
): Promise<string | null> {
  const asociatie = await db.asociatie.findUnique({
    where: { id: asociatieId },
    select: { organizatieId: true },
  })

  return asociatie?.organizatieId || null
}

/**
 * Get organization ID from user ID (first organization they belong to)
 */
export async function getOrganizatieFromUser(
  userId: string
): Promise<string | null> {
  const membership = await db.utilizatorOrganizatie.findFirst({
    where: { userId, esteActiv: true },
    select: { organizatieId: true },
    orderBy: { createdAt: 'asc' },
  })

  return membership?.organizatieId || null
}

/**
 * Get all organizations a user belongs to
 */
export async function getUserOrganizations(
  userId: string
): Promise<Array<{ id: string; nume: string; rol: string }>> {
  const memberships = await db.utilizatorOrganizatie.findMany({
    where: { userId, esteActiv: true },
    include: {
      organizatie: {
        select: { id: true, nume: true },
      },
    },
  })

  return memberships.map((m) => ({
    id: m.organizatie.id,
    nume: m.organizatie.nume,
    rol: m.rol,
  }))
}

// ============================================
// PERMISSION HELPERS
// ============================================

/**
 * Check if a user has a specific role in an organization
 */
export async function hasRole(
  userId: string,
  organizatieId: string,
  roles: string | string[]
): Promise<boolean> {
  const membership = await db.utilizatorOrganizatie.findUnique({
    where: {
      userId_organizatieId: {
        userId,
        organizatieId,
      },
    },
  })

  if (!membership || !membership.esteActiv) return false

  const roleArray = Array.isArray(roles) ? roles : [roles]
  return roleArray.includes(membership.rol)
}

/**
 * Check if user is OWNER or ADMIN of an organization
 */
export async function isOrgAdmin(
  userId: string,
  organizatieId: string
): Promise<boolean> {
  return hasRole(userId, organizatieId, ['OWNER', 'ADMIN'])
}

/**
 * Check if user has write access to financial data
 */
export async function hasFinancialAccess(
  userId: string,
  organizatieId: string
): Promise<boolean> {
  return hasRole(userId, organizatieId, ['OWNER', 'ADMIN', 'MANAGER', 'CONTABIL'])
}

/**
 * Check if user has access to a specific association
 */
export async function hasAsociatieAccess(
  userId: string,
  organizatieId: string,
  asociatieId: string
): Promise<boolean> {
  const membership = await db.utilizatorOrganizatie.findUnique({
    where: {
      userId_organizatieId: {
        userId,
        organizatieId,
      },
    },
  })

  if (!membership || !membership.esteActiv) return false

  // Empty array means access to all associations
  if (membership.asociatiiAccess.length === 0) return true

  return membership.asociatiiAccess.includes(asociatieId)
}
