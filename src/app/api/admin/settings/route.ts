/**
 * API Route: Platform Settings (Super Admin Only)
 *
 * GET - Get current platform settings
 * PUT - Update platform settings
 *
 * /api/admin/settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET - Retrieve platform settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!(session?.user as any)?.id || (session?.user as any)?.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Acces interzis. Necesită rol SUPER_ADMIN.' },
        { status: 403 }
      )
    }

    const settings = await db.platformSettings.findUnique({
      where: { id: 'default' },
    })

    if (!settings) {
      // Create default settings if not exists
      const defaultSettings = await db.platformSettings.create({
        data: { id: 'default' },
      })
      return NextResponse.json(defaultSettings)
    }

    // Mask sensitive fields for display
    const maskedSettings = {
      ...settings,
      revolutApiKey: settings.revolutApiKey ? '••••••••' + settings.revolutApiKey.slice(-4) : null,
      revolutWebhookSecret: settings.revolutWebhookSecret
        ? '••••••••' + settings.revolutWebhookSecret.slice(-4)
        : null,
    }

    return NextResponse.json(maskedSettings)
  } catch (error) {
    console.error('Error fetching platform settings:', error)
    return NextResponse.json(
      { error: 'Eroare la încărcarea setărilor' },
      { status: 500 }
    )
  }
}

// PUT - Update platform settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!(session?.user as any)?.id || (session?.user as any)?.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Acces interzis. Necesită rol SUPER_ADMIN.' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Fields that can be updated
    const allowedFields = [
      // Trial & Grace
      'trialDays',
      'graceDays',
      'trialWarningDays',
      'paymentWarningDays',

      // Feature toggles
      'aiEnabled',
      'spvEnabled',
      'stripeEnabled',

      // Platform branding
      'platformName',
      'platformLogo',
      'platformFavicon',
      'primaryColor',
      'supportEmail',

      // Legal
      'termsUrl',
      'privacyUrl',

      // Maintenance
      'maintenanceMode',
      'maintenanceMessage',

      // Revolut Payment Gateway
      'revolutEnabled',
      'revolutEnvironment',
      'revolutApiKey',
      'revolutWebhookSecret',

      // Company billing
      'companyName',
      'companyCui',
      'companyRegCom',
      'companyAddress',
      'companyCity',
      'companyCounty',
      'companyCountry',
      'companyIban',
      'companyBank',
      'companyEmail',
      'companyPhone',
      'companyIsVatPayer',
      'vatRate',
    ]

    // Filter only allowed fields
    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // Don't update masked values (keep existing)
        if (
          (field === 'revolutApiKey' || field === 'revolutWebhookSecret') &&
          body[field]?.startsWith('••••')
        ) {
          continue
        }
        updateData[field] = body[field]
      }
    }

    // Add updatedBy
    updateData.updatedBy = (session!.user as any).id

    const settings = await db.platformSettings.upsert({
      where: { id: 'default' },
      update: updateData,
      create: {
        id: 'default',
        ...updateData,
      },
    })

    // Mask sensitive fields in response
    const maskedSettings = {
      ...settings,
      revolutApiKey: settings.revolutApiKey ? '••••••••' + settings.revolutApiKey.slice(-4) : null,
      revolutWebhookSecret: settings.revolutWebhookSecret
        ? '••••••••' + settings.revolutWebhookSecret.slice(-4)
        : null,
    }

    return NextResponse.json({
      success: true,
      settings: maskedSettings,
    })
  } catch (error) {
    console.error('Error updating platform settings:', error)
    return NextResponse.json(
      { error: 'Eroare la salvarea setărilor' },
      { status: 500 }
    )
  }
}
