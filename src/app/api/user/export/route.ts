/**
 * API Route: GDPR Data Export
 *
 * Exports all user data as JSON per GDPR requirements.
 * POST /api/user/export
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { checkRateLimit, getClientIdentifier, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for GDPR export (sensitive operation)
    const clientId = getClientIdentifier(request)
    const rateLimitResult = checkRateLimit(`gdpr-export:${clientId}`, RATE_LIMIT_CONFIGS.auth)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Prea multe cereri. Te rugăm să aștepți.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          }
        }
      )
    }

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as any).id

    // Fetch all user data
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        emailVerified: true,
        // Exclude password for security
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilizator negăsit' }, { status: 404 })
    }

    // Fetch apartments owned
    const apartamente = await db.proprietarApartament.findMany({
      where: { userId },
      include: {
        apartament: {
          select: {
            id: true,
            numar: true,
            etaj: true,
            suprafata: true,
            nrCamere: true,
            asociatie: {
              select: {
                id: true,
                nume: true,
                adresa: true,
              },
            },
          },
        },
      },
    })

    // Fetch payments
    const plati = await db.plata.findMany({
      where: { userId },
      select: {
        id: true,
        suma: true,
        dataPlata: true,
        metodaPlata: true,
        status: true,
        referinta: true,
        chitanta: {
          select: {
            numar: true,
            luna: true,
            an: true,
            sumaTotal: true,
          },
        },
      },
    })

    // Fetch tickets created
    const tichete = await db.tichet.findMany({
      where: { creatorId: userId },
      select: {
        id: true,
        numar: true,
        titlu: true,
        descriere: true,
        categorie: true,
        prioritate: true,
        status: true,
        locatie: true,
        createdAt: true,
        rezolvatLa: true,
      },
    })

    // Fetch notifications
    const notificari = await db.notificare.findMany({
      where: { userId },
      select: {
        id: true,
        tip: true,
        titlu: true,
        mesaj: true,
        citita: true,
        createdAt: true,
      },
    })

    // Fetch consents
    const consents = await db.consent.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        granted: true,
        version: true,
        createdAt: true,
      },
    })

    // Fetch organization memberships
    const organizatii = await db.utilizatorOrganizatie.findMany({
      where: { userId },
      select: {
        rol: true,
        esteActiv: true,
        invitedAt: true,
        acceptedAt: true,
        organizatie: {
          select: {
            id: true,
            nume: true,
          },
        },
      },
    })

    // Compile all data
    const exportData = {
      exportDate: new Date().toISOString(),
      exportVersion: '1.0',
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        emailVerified: user.emailVerified?.toISOString() || null,
      },
      apartamente: apartamente.map((pa) => ({
        proprietate: {
          cotaParte: pa.cotaParte,
          dataInceput: pa.dataInceput.toISOString(),
          dataSfarsit: pa.dataSfarsit?.toISOString() || null,
          esteActiv: pa.esteActiv,
        },
        apartament: pa.apartament,
      })),
      plati: plati.map((p) => ({
        ...p,
        dataPlata: p.dataPlata.toISOString(),
      })),
      tichete: tichete.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        rezolvatLa: t.rezolvatLa?.toISOString() || null,
      })),
      notificari: notificari.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
      })),
      consents: consents.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      })),
      organizatii: organizatii.map((o) => ({
        ...o,
        invitedAt: o.invitedAt.toISOString(),
        acceptedAt: o.acceptedAt?.toISOString() || null,
      })),
    }

    // Return as downloadable JSON
    const jsonString = JSON.stringify(exportData, null, 2)

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="blochub-data-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    console.error('GDPR export error:', error)
    return NextResponse.json(
      { error: 'Eroare la exportul datelor' },
      { status: 500 }
    )
  }
}
