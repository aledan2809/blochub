/**
 * SPV Sync API Route
 *
 * Manually triggers synchronization of invoices from ANAF.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { countryRegistry } from '@/modules/countries'

// POST - Trigger manual sync
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
      select: { id: true, cui: true },
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    // Check if SPV is connected
    const credentials = await db.sPVCredentials.findUnique({
      where: { asociatieId: asociatie.id },
    })

    if (!credentials?.accessToken) {
      return NextResponse.json(
        { error: 'SPV nu este conectat. Autorizați-vă mai întâi.' },
        { status: 400 }
      )
    }

    // Get fiscal module and sync
    const fiscalModule = countryRegistry.getFiscalModule('RO')
    if (!fiscalModule) {
      return NextResponse.json(
        { error: 'Modulul fiscal nu este disponibil' },
        { status: 500 }
      )
    }

    const result = await fiscalModule.syncInvoices(asociatie.id)

    return NextResponse.json({
      success: result.success,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
      syncedAt: result.syncedAt,
    })
  } catch (error) {
    console.error('SPV sync error:', error)
    return NextResponse.json(
      { error: 'Eroare la sincronizarea facturilor' },
      { status: 500 }
    )
  }
}
