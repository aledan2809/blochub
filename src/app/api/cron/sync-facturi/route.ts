/**
 * Cron Job: Sync SPV Invoices
 *
 * This cron job runs daily at 22:00 and syncs invoices from ANAF
 * for all associations that have SPV connected.
 *
 * Schedule: 0 22 * * * (daily at 22:00)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { countryRegistry } from '@/modules/countries'

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CRON] Starting SPV invoice sync...')

    // Get all associations with SPV configured
    const spvCredentials = await db.sPVCredentials.findMany({
      where: {
        accessToken: { not: null },
      },
      include: {
        asociatie: {
          select: { id: true, nume: true, cui: true },
        },
      },
    })

    console.log(`[CRON] Found ${spvCredentials.length} associations with SPV configured`)

    const results = {
      total: spvCredentials.length,
      success: 0,
      failed: 0,
      details: [] as {
        asociatieId: string
        asociatieName: string
        success: boolean
        imported: number
        error?: string
      }[],
    }

    // Get fiscal module
    const fiscalModule = countryRegistry.getFiscalModule('RO')
    if (!fiscalModule) {
      console.error('[CRON] Romania fiscal module not available')
      return NextResponse.json({
        error: 'Fiscal module not available',
        results,
      })
    }

    // Process each association
    for (const cred of spvCredentials) {
      try {
        console.log(`[CRON] Syncing invoices for: ${cred.asociatie.nume}`)

        const syncResult = await fiscalModule.syncInvoices(cred.asociatieId)

        results.details.push({
          asociatieId: cred.asociatieId,
          asociatieName: cred.asociatie.nume,
          success: syncResult.success,
          imported: syncResult.imported,
          error: syncResult.errors.length > 0 ? syncResult.errors.join('; ') : undefined,
        })

        if (syncResult.success) {
          results.success++
          console.log(
            `[CRON] ✓ ${cred.asociatie.nume}: ${syncResult.imported} imported, ${syncResult.skipped} skipped`
          )
        } else {
          results.failed++
          console.log(`[CRON] ✗ ${cred.asociatie.nume}: ${syncResult.errors.join(', ')}`)
        }
      } catch (error) {
        results.failed++
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        results.details.push({
          asociatieId: cred.asociatieId,
          asociatieName: cred.asociatie.nume,
          success: false,
          imported: 0,
          error: errorMsg,
        })
        console.error(`[CRON] ✗ ${cred.asociatie.nume}: ${errorMsg}`)
      }
    }

    console.log(
      `[CRON] SPV sync completed: ${results.success} success, ${results.failed} failed`
    )

    return NextResponse.json({
      success: true,
      message: `Synced ${results.success}/${results.total} associations`,
      results,
    })
  } catch (error) {
    console.error('[CRON] SPV sync error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}

// Also support POST for Vercel Cron
export async function POST(request: NextRequest) {
  return GET(request)
}
