/**
 * SPV OAuth Callback Route
 *
 * Handles the OAuth callback from ANAF after user authorization.
 * Exchanges the authorization code for access and refresh tokens.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Environment variables
const SPV_CLIENT_ID = process.env.ANAF_SPV_CLIENT_ID || ''
const SPV_CLIENT_SECRET = process.env.ANAF_SPV_CLIENT_SECRET || ''
const SPV_REDIRECT_URI = process.env.ANAF_SPV_REDIRECT_URI || ''
const ANAF_OAUTH_TOKEN = 'https://logincert.anaf.ro/anaf-oauth2/v1/token'
const APP_URL = process.env.NEXTAUTH_URL || 'https://app.blochub.ro'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Handle ANAF error response
    if (error) {
      const redirectUrl = new URL('/dashboard/setari', APP_URL)
      redirectUrl.searchParams.set('spv_error', errorDescription || error)
      return NextResponse.redirect(redirectUrl)
    }

    // Validate parameters
    if (!code || !state) {
      const redirectUrl = new URL('/dashboard/setari', APP_URL)
      redirectUrl.searchParams.set('spv_error', 'Parametri lipsă în callback')
      return NextResponse.redirect(redirectUrl)
    }

    // Find credentials with matching state
    const credentials = await db.sPVCredentials.findFirst({
      where: { oauthState: state },
      include: {
        asociatie: {
          select: { id: true, adminId: true },
        },
      },
    })

    if (!credentials) {
      const redirectUrl = new URL('/dashboard/setari', APP_URL)
      redirectUrl.searchParams.set('spv_error', 'State invalid sau expirat')
      return NextResponse.redirect(redirectUrl)
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(ANAF_OAUTH_TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: SPV_CLIENT_ID,
        client_secret: SPV_CLIENT_SECRET,
        redirect_uri: SPV_REDIRECT_URI,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('ANAF token exchange error:', errorText)

      const redirectUrl = new URL('/dashboard/setari', APP_URL)
      redirectUrl.searchParams.set('spv_error', 'Eroare la autorizarea ANAF')
      return NextResponse.redirect(redirectUrl)
    }

    const tokenData = await tokenResponse.json()

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

    // Update credentials with tokens
    await db.sPVCredentials.update({
      where: { id: credentials.id },
      data: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        oauthState: null, // Clear state after successful use
      },
    })

    // Redirect to settings with success message
    const redirectUrl = new URL('/dashboard/setari', APP_URL)
    redirectUrl.searchParams.set('spv_success', 'true')
    redirectUrl.searchParams.set('tab', 'fiscal')

    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('SPV callback error:', error)

    const redirectUrl = new URL('/dashboard/setari', APP_URL)
    redirectUrl.searchParams.set('spv_error', 'Eroare internă la procesarea callback-ului')
    return NextResponse.redirect(redirectUrl)
  }
}
