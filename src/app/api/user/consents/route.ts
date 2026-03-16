/**
 * API Route: GDPR Consent Management
 *
 * GET /api/user/consents - Get all user consents
 * POST /api/user/consents - Save new consent record
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { ConsentType } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as any).id

    // Get latest consent for each type
    const consents = await db.consent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    // Group by type and get the latest
    const latestConsents: Record<string, typeof consents[0]> = {}
    for (const consent of consents) {
      if (!latestConsents[consent.type]) {
        latestConsents[consent.type] = consent
      }
    }

    return NextResponse.json({
      consents: Object.values(latestConsents).map((c) => ({
        id: c.id,
        type: c.type,
        granted: c.granted,
        version: c.version,
        createdAt: c.createdAt.toISOString(),
      })),
      history: consents.map((c) => ({
        id: c.id,
        type: c.type,
        granted: c.granted,
        version: c.version,
        createdAt: c.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Get consents error:', error)
    return NextResponse.json(
      { error: 'Eroare la obținerea consimțămintelor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // For cookie consent, we might not have a session yet (anonymous users)
    // In that case, we'll store it only if we have a session
    const userId = (session?.user as any)?.id

    const body = await request.json()
    const { consents, version = '1.0' } = body

    if (!consents || !Array.isArray(consents)) {
      return NextResponse.json(
        { error: 'Lista de consimțăminte este necesară' },
        { status: 400 }
      )
    }

    // Validate consent types
    const validTypes: ConsentType[] = [
      'COOKIE_NECESSARY',
      'COOKIE_ANALYTICS',
      'COOKIE_MARKETING',
      'PRIVACY_POLICY',
      'TERMS_OF_SERVICE',
      'DATA_PROCESSING',
    ]

    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      null
    const userAgent = request.headers.get('user-agent') || null

    // If user is logged in, save to database
    if (userId) {
      const createdConsents = await db.$transaction(
        consents.map((consent: { type: ConsentType; granted: boolean }) => {
          if (!validTypes.includes(consent.type)) {
            throw new Error(`Tip de consimțământ invalid: ${consent.type}`)
          }

          return db.consent.create({
            data: {
              userId,
              type: consent.type,
              granted: consent.granted,
              version,
              ipAddress,
              userAgent,
            },
          })
        })
      )

      return NextResponse.json({
        success: true,
        message: 'Consimțămintele au fost salvate',
        saved: createdConsents.length,
      })
    }

    // For anonymous users, just acknowledge (actual storage is in localStorage)
    return NextResponse.json({
      success: true,
      message: 'Consimțămintele au fost înregistrate',
      saved: 0,
      note: 'Autentificați-vă pentru a persista consimțămintele în baza de date',
    })
  } catch (error) {
    console.error('Save consents error:', error)
    return NextResponse.json(
      { error: 'Eroare la salvarea consimțămintelor' },
      { status: 500 }
    )
  }
}
