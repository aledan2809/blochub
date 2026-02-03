/**
 * SPV OAuth Authorization Route
 *
 * Initiates the OAuth flow with ANAF for SPV/e-Factura integration.
 * Generates a state parameter and redirects to ANAF authorization page.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import crypto from 'crypto'
import { countryRegistry } from '@/modules/countries'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id

    // Get user's association
    const asociatie = await db.asociatie.findFirst({
      where: { adminId: userId },
      select: { id: true, cui: true, nume: true },
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    if (!asociatie.cui) {
      return NextResponse.json(
        { error: 'CUI-ul asociației nu este configurat. Completați CUI-ul în setări.' },
        { status: 400 }
      )
    }

    // Get fiscal module for Romania
    const fiscalModule = countryRegistry.getFiscalModule('RO')
    if (!fiscalModule || !fiscalModule.isConfigured()) {
      return NextResponse.json(
        { error: 'Integrarea SPV nu este configurată pe server' },
        { status: 500 }
      )
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex')

    // Store state in database (or you could use a signed cookie)
    await db.sPVCredentials.upsert({
      where: { asociatieId: asociatie.id },
      create: {
        asociatieId: asociatie.id,
        cuiAsociatie: asociatie.cui,
        oauthState: state,
      },
      update: {
        cuiAsociatie: asociatie.cui,
        oauthState: state,
      },
    })

    // Generate authorization URL
    const authUrl = fiscalModule.getAuthorizationUrl(state)

    return NextResponse.json({
      authUrl,
      message: 'Redirecționare către ANAF pentru autorizare',
    })
  } catch (error) {
    console.error('SPV auth error:', error)
    return NextResponse.json(
      { error: 'Eroare la inițializarea autorizării SPV' },
      { status: 500 }
    )
  }
}

// POST - Get status of SPV connection
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id

    // Get user's association
    const asociatie = await db.asociatie.findFirst({
      where: { adminId: userId },
      select: { id: true },
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    // Get SPV credentials
    const credentials = await db.sPVCredentials.findUnique({
      where: { asociatieId: asociatie.id },
      select: {
        id: true,
        cuiAsociatie: true,
        expiresAt: true,
        lastSync: true,
        lastSyncError: true,
        accessToken: true,
      },
    })

    const fiscalModule = countryRegistry.getFiscalModule('RO')

    return NextResponse.json({
      configured: fiscalModule?.isConfigured() || false,
      connected: !!(credentials?.accessToken),
      cui: credentials?.cuiAsociatie || null,
      expiresAt: credentials?.expiresAt || null,
      lastSync: credentials?.lastSync || null,
      lastSyncError: credentials?.lastSyncError || null,
      systemName: fiscalModule?.systemName || 'SPV',
    })
  } catch (error) {
    console.error('SPV status error:', error)
    return NextResponse.json(
      { error: 'Eroare la verificarea stării SPV' },
      { status: 500 }
    )
  }
}

// DELETE - Disconnect SPV
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id

    // Get user's association
    const asociatie = await db.asociatie.findFirst({
      where: { adminId: userId },
      select: { id: true },
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    // Get fiscal module and disconnect
    const fiscalModule = countryRegistry.getFiscalModule('RO')
    if (fiscalModule) {
      await fiscalModule.disconnect(asociatie.id)
    }

    return NextResponse.json({
      success: true,
      message: 'Deconectare SPV reușită',
    })
  } catch (error) {
    console.error('SPV disconnect error:', error)
    return NextResponse.json(
      { error: 'Eroare la deconectarea SPV' },
      { status: 500 }
    )
  }
}
