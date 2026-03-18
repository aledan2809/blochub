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
import { z } from 'zod'

const updateSettingsSchema = z.object({
  // Trial & Grace
  trialDays: z.number().int().min(0).max(365).optional(),
  graceDays: z.number().int().min(0).max(90).optional(),
  trialWarningDays: z.number().int().min(0).max(30).optional(),
  paymentWarningDays: z.number().int().min(0).max(30).optional(),

  // Feature toggles
  aiEnabled: z.boolean().optional(),
  spvEnabled: z.boolean().optional(),
  stripeEnabled: z.boolean().optional(),

  // Platform branding
  platformName: z.string().max(100).optional(),
  platformLogo: z.string().max(500).optional().nullable(),
  platformFavicon: z.string().max(500).optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  supportEmail: z.string().email().optional(),

  // Legal
  termsUrl: z.string().max(500).optional().nullable(),
  privacyUrl: z.string().max(500).optional().nullable(),

  // Maintenance
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().max(500).optional().nullable(),

  // Revolut Payment Gateway
  revolutEnabled: z.boolean().optional(),
  revolutEnvironment: z.enum(['sandbox', 'production']).optional(),
  revolutApiKey: z.string().max(200).optional().nullable(),
  revolutWebhookSecret: z.string().max(200).optional().nullable(),

  // Stripe Payment Gateway
  stripeSecretKey: z.string().max(200).optional().nullable(),
  stripePublishableKey: z.string().max(200).optional().nullable(),
  stripeWebhookSecret: z.string().max(200).optional().nullable(),
  stripeEnvironment: z.enum(['test', 'live']).optional(),

  // Company billing
  companyName: z.string().max(200).optional().nullable(),
  companyCui: z.string().max(20).optional().nullable(),
  companyRegCom: z.string().max(30).optional().nullable(),
  companyAddress: z.string().max(300).optional().nullable(),
  companyCity: z.string().max(100).optional().nullable(),
  companyCounty: z.string().max(100).optional().nullable(),
  companyCountry: z.string().max(100).optional().nullable(),
  companyIban: z.string().max(34).optional().nullable(),
  companyBank: z.string().max(100).optional().nullable(),
  companyEmail: z.string().email().max(100).optional().nullable(),
  companyPhone: z.string().max(20).optional().nullable(),
  companyIsVatPayer: z.boolean().optional(),
  vatRate: z.number().min(0).max(100).optional(),
})

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
      stripeSecretKey: settings.stripeSecretKey ? '••••••••' + settings.stripeSecretKey.slice(-4) : null,
      stripeWebhookSecret: settings.stripeWebhookSecret
        ? '••••••••' + settings.stripeWebhookSecret.slice(-4)
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
    const validatedBody = updateSettingsSchema.parse(body)

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

      // Stripe Payment Gateway
      'stripeSecretKey',
      'stripePublishableKey',
      'stripeWebhookSecret',
      'stripeEnvironment',

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
      if ((validatedBody as Record<string, unknown>)[field] !== undefined) {
        // Don't update masked values (keep existing)
        if (
          (field === 'revolutApiKey' || field === 'revolutWebhookSecret' ||
           field === 'stripeSecretKey' || field === 'stripeWebhookSecret') &&
          ((validatedBody as Record<string, unknown>)[field] as string)?.startsWith('••••')
        ) {
          continue
        }
        updateData[field] = (validatedBody as Record<string, unknown>)[field]
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
      stripeSecretKey: settings.stripeSecretKey ? '••••••••' + settings.stripeSecretKey.slice(-4) : null,
      stripeWebhookSecret: settings.stripeWebhookSecret
        ? '••••••••' + settings.stripeWebhookSecret.slice(-4)
        : null,
    }

    return NextResponse.json({
      success: true,
      settings: maskedSettings,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Error updating platform settings:', error)
    return NextResponse.json(
      { error: 'Eroare la salvarea setărilor' },
      { status: 500 }
    )
  }
}
