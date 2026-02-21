/**
 * API Route Guards for Feature Gating
 *
 * Middleware utilities for protecting API routes based on
 * subscription plans, features, and usage limits.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Feature } from './features'
import {
  hasFeature,
  checkLimit,
  canUseResource,
  getOrganizatieFromAsociatie,
  getOrganizatieFromUser,
  hasRole,
  hasAsociatieAccess,
  SubscriptionContext,
} from './subscription'

// ============================================
// TYPES
// ============================================

export interface GuardContext {
  session: {
    user: {
      id: string
      email: string
      name?: string
      role: string
    }
  }
  organizatieId: string
  asociatieId?: string
}

export type GuardHandler<T = unknown> = (
  request: NextRequest,
  context: GuardContext
) => Promise<NextResponse<T>>

// ============================================
// ERROR RESPONSES
// ============================================

export const ErrorResponses = {
  unauthorized: () =>
    NextResponse.json(
      { error: 'Nu sunteți autentificat', code: 'UNAUTHORIZED' },
      { status: 401 }
    ),

  forbidden: (message = 'Nu aveți permisiunea necesară') =>
    NextResponse.json(
      { error: message, code: 'FORBIDDEN' },
      { status: 403 }
    ),

  notFound: (resource = 'Resursa') =>
    NextResponse.json(
      { error: `${resource} nu a fost găsită`, code: 'NOT_FOUND' },
      { status: 404 }
    ),

  featureNotAvailable: (feature: string) =>
    NextResponse.json(
      {
        error: 'Funcționalitate indisponibilă în planul curent',
        code: 'FEATURE_NOT_AVAILABLE',
        feature,
        upgradeUrl: '/dashboard/upgrade',
      },
      { status: 403 }
    ),

  featureReadOnly: (feature: string) =>
    NextResponse.json(
      {
        error: 'Funcționalitate disponibilă doar în mod citire',
        code: 'FEATURE_READ_ONLY',
        feature,
        message: 'Upgrade-ați planul pentru a putea modifica aceste date.',
        upgradeUrl: '/dashboard/upgrade',
      },
      { status: 403 }
    ),

  limitExceeded: (
    limitType: string,
    current: number,
    max: number
  ) =>
    NextResponse.json(
      {
        error: `Ați atins limita pentru ${limitType}`,
        code: 'LIMIT_EXCEEDED',
        limitType,
        current,
        max,
        upgradeUrl: '/dashboard/upgrade',
      },
      { status: 403 }
    ),

  subscriptionRequired: () =>
    NextResponse.json(
      {
        error: 'Este necesar un abonament activ',
        code: 'SUBSCRIPTION_REQUIRED',
        upgradeUrl: '/dashboard/upgrade',
      },
      { status: 403 }
    ),

  subscriptionSuspended: () =>
    NextResponse.json(
      {
        error: 'Abonamentul este suspendat',
        code: 'SUBSCRIPTION_SUSPENDED',
        message: 'Vă rugăm să actualizați metoda de plată.',
        upgradeUrl: '/dashboard/billing',
      },
      { status: 403 }
    ),
}

// ============================================
// BASE GUARDS
// ============================================

/**
 * Require authentication
 */
export async function requireAuth(request: NextRequest): Promise<GuardContext | NextResponse> {
  const session = await getServerSession(authOptions)

  if (!(session?.user as any)?.id) {
    return ErrorResponses.unauthorized()
  }

  // Get organization ID from user
  const organizatieId = await getOrganizatieFromUser((session!.user as any).id)

  if (!organizatieId) {
    return ErrorResponses.subscriptionRequired()
  }

  return {
    session: session as unknown as GuardContext['session'],
    organizatieId,
  }
}

/**
 * Require authentication and get organization from asociatie param
 */
export async function requireAuthWithAsociatie(
  request: NextRequest,
  asociatieId: string
): Promise<GuardContext | NextResponse> {
  const session = await getServerSession(authOptions)

  if (!(session?.user as any)?.id) {
    return ErrorResponses.unauthorized()
  }

  const organizatieId = await getOrganizatieFromAsociatie(asociatieId)

  if (!organizatieId) {
    return ErrorResponses.notFound('Asociația')
  }

  // Check if user has access to this association
  const hasAccess = await hasAsociatieAccess(
    (session!.user as any).id,
    organizatieId,
    asociatieId
  )

  if (!hasAccess) {
    return ErrorResponses.forbidden('Nu aveți acces la această asociație')
  }

  return {
    session: session as unknown as GuardContext['session'],
    organizatieId,
    asociatieId,
  }
}

// ============================================
// FEATURE GUARDS
// ============================================

/**
 * Create a guard that checks for a specific feature
 */
export function withFeatureCheck(feature: Feature) {
  return async function guard(
    request: NextRequest,
    handler: GuardHandler
  ): Promise<NextResponse> {
    const authResult = await requireAuth(request)

    if (authResult instanceof NextResponse) {
      return authResult
    }

    const featureResult = await hasFeature(authResult.organizatieId, feature)

    if (!featureResult.allowed) {
      if (featureResult.reason === 'suspended') {
        return ErrorResponses.subscriptionSuspended()
      }
      if (featureResult.reason === 'not_subscribed') {
        return ErrorResponses.subscriptionRequired()
      }
      return ErrorResponses.featureNotAvailable(feature)
    }

    return handler(request, authResult)
  }
}

/**
 * Create a guard that checks for a feature with write permission
 * (fails if feature is in read-only mode)
 */
export function withFeatureWrite(feature: Feature) {
  return async function guard(
    request: NextRequest,
    handler: GuardHandler
  ): Promise<NextResponse> {
    const authResult = await requireAuth(request)

    if (authResult instanceof NextResponse) {
      return authResult
    }

    const featureResult = await hasFeature(authResult.organizatieId, feature)

    if (!featureResult.allowed) {
      if (featureResult.reason === 'suspended') {
        return ErrorResponses.subscriptionSuspended()
      }
      if (featureResult.reason === 'not_subscribed') {
        return ErrorResponses.subscriptionRequired()
      }
      return ErrorResponses.featureNotAvailable(feature)
    }

    if (featureResult.isReadOnly) {
      return ErrorResponses.featureReadOnly(feature)
    }

    return handler(request, authResult)
  }
}

// ============================================
// LIMIT GUARDS
// ============================================

/**
 * Create a guard that checks a usage limit before allowing action
 */
export function withLimitCheck(
  limitType: keyof SubscriptionContext['limits'],
  limitLabel: string
) {
  return async function guard(
    request: NextRequest,
    handler: GuardHandler
  ): Promise<NextResponse> {
    const authResult = await requireAuth(request)

    if (authResult instanceof NextResponse) {
      return authResult
    }

    const limitResult = await checkLimit(authResult.organizatieId, limitType)

    if (!limitResult.allowed) {
      return ErrorResponses.limitExceeded(
        limitLabel,
        limitResult.current,
        limitResult.max
      )
    }

    return handler(request, authResult)
  }
}

/**
 * Check AI request limit before processing
 */
export async function checkAILimit(
  organizatieId: string
): Promise<NextResponse | null> {
  const canUse = await canUseResource(organizatieId, 'AI_REQUEST')

  if (!canUse) {
    const limitResult = await checkLimit(organizatieId, 'aiRequests')
    return ErrorResponses.limitExceeded(
      'cereri AI',
      limitResult.current,
      limitResult.max
    )
  }

  return null
}

/**
 * Check email limit before sending
 */
export async function checkEmailLimit(
  organizatieId: string
): Promise<NextResponse | null> {
  const canUse = await canUseResource(organizatieId, 'EMAIL_SENT')

  if (!canUse) {
    const limitResult = await checkLimit(organizatieId, 'emailsPerMonth')
    return ErrorResponses.limitExceeded(
      'email-uri/lună',
      limitResult.current,
      limitResult.max
    )
  }

  return null
}

// ============================================
// ROLE GUARDS
// ============================================

/**
 * Create a guard that requires specific roles
 */
export function withRoleCheck(roles: string | string[]) {
  return async function guard(
    request: NextRequest,
    handler: GuardHandler
  ): Promise<NextResponse> {
    const authResult = await requireAuth(request)

    if (authResult instanceof NextResponse) {
      return authResult
    }

    const session = authResult.session
    const organizatieId = authResult.organizatieId

    const hasRequiredRole = await hasRole((session!.user as any).id, organizatieId, roles)

    if (!hasRequiredRole) {
      return ErrorResponses.forbidden(
        'Nu aveți rolul necesar pentru această acțiune'
      )
    }

    return handler(request, authResult)
  }
}

/**
 * Require OWNER or ADMIN role
 */
export const withAdminRole = withRoleCheck(['OWNER', 'ADMIN'])

/**
 * Require OWNER role only
 */
export const withOwnerRole = withRoleCheck('OWNER')

/**
 * Require financial access (OWNER, ADMIN, MANAGER, CONTABIL)
 */
export const withFinancialAccess = withRoleCheck([
  'OWNER',
  'ADMIN',
  'MANAGER',
  'CONTABIL',
])

// ============================================
// SUPER ADMIN GUARD
// ============================================

/**
 * Require SUPER_ADMIN role (global, not per-organization)
 */
export async function requireSuperAdmin(
  request: NextRequest
): Promise<{ session: GuardContext['session'] } | NextResponse> {
  const session = await getServerSession(authOptions)

  if (!(session?.user as any)?.id) {
    return ErrorResponses.unauthorized()
  }

  if ((session!.user as any).role !== 'SUPER_ADMIN') {
    return ErrorResponses.forbidden('Acces rezervat administratorilor platformei')
  }

  return { session: session as unknown as GuardContext['session'] }
}

// ============================================
// COMBINED GUARDS
// ============================================

/**
 * Combine multiple guards into one
 */
export function combineGuards(...guards: Array<(req: NextRequest, handler: GuardHandler) => Promise<NextResponse>>) {
  return async function combinedGuard(
    request: NextRequest,
    handler: GuardHandler
  ): Promise<NextResponse> {
    for (const guard of guards) {
      // Create a pass-through handler that returns a success response
      const result = await guard(request, async (req, ctx) => {
        return NextResponse.json({ _guardPassed: true, ctx })
      })

      // Check if guard passed
      const data = await result.json()
      if (!data._guardPassed) {
        return result
      }
    }

    // All guards passed, run the actual handler
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    return handler(request, authResult)
  }
}

// ============================================
// USAGE EXAMPLE
// ============================================

/*
// In an API route:

import { withFeatureCheck } from '@/lib/api-guards'
import { FEATURES } from '@/lib/features'

export async function POST(request: NextRequest) {
  return withFeatureCheck(FEATURES.OCR_FACTURI)(request, async (req, ctx) => {
    // ctx contains session and organizatieId
    const { organizatieId } = ctx

    // Check AI limit before processing
    const aiLimitError = await checkAILimit(organizatieId)
    if (aiLimitError) return aiLimitError

    // Log the usage
    await logUsage(organizatieId, 'AI_REQUEST', {
      detalii: { action: 'ocr_factura' }
    })

    // Process the request...
    return NextResponse.json({ success: true })
  })
}
*/
