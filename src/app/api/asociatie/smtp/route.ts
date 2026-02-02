import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { clearSMTPConfigCache } from '@/lib/email'

const smtpConfigSchema = z.object({
  host: z.string().min(1, 'Host este obligatoriu'),
  port: z.number().int().min(1).max(65535).default(587),
  secure: z.boolean().default(false),
  user: z.string().min(1, 'Utilizatorul este obligatoriu'),
  password: z.string().min(1, 'Parola este obligatorie'),
  fromEmail: z.string().email('Email invalid'),
  fromName: z.string().optional(),
  enabled: z.boolean().default(false),
})

// GET - Get SMTP configuration
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id

    // Get user's asociatie
    const asociatie = await db.asociatie.findFirst({
      where: { adminId: userId },
      select: { id: true },
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    // Get SMTP config
    const smtpConfig = await db.sMTPConfig.findUnique({
      where: { asociatieId: asociatie.id },
      select: {
        id: true,
        host: true,
        port: true,
        secure: true,
        user: true,
        // Don't return password for security
        fromEmail: true,
        fromName: true,
        enabled: true,
        lastTest: true,
        lastTestSuccess: true,
        lastTestError: true,
      },
    })

    return NextResponse.json({
      configured: !!smtpConfig,
      config: smtpConfig,
    })
  } catch (error) {
    console.error('Error fetching SMTP config:', error)
    return NextResponse.json(
      { error: 'Eroare la încărcarea configurației SMTP' },
      { status: 500 }
    )
  }
}

// PUT - Update SMTP configuration
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const body = await request.json()

    // Validate input
    const validatedData = smtpConfigSchema.parse(body)

    // Get user's asociatie
    const asociatie = await db.asociatie.findFirst({
      where: { adminId: userId },
      select: { id: true },
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    // Upsert SMTP config
    const smtpConfig = await db.sMTPConfig.upsert({
      where: { asociatieId: asociatie.id },
      create: {
        asociatieId: asociatie.id,
        host: validatedData.host,
        port: validatedData.port,
        secure: validatedData.secure,
        user: validatedData.user,
        password: validatedData.password, // TODO: encrypt in production
        fromEmail: validatedData.fromEmail,
        fromName: validatedData.fromName || null,
        enabled: validatedData.enabled,
      },
      update: {
        host: validatedData.host,
        port: validatedData.port,
        secure: validatedData.secure,
        user: validatedData.user,
        password: validatedData.password, // TODO: encrypt in production
        fromEmail: validatedData.fromEmail,
        fromName: validatedData.fromName || null,
        enabled: validatedData.enabled,
      },
      select: {
        id: true,
        host: true,
        port: true,
        secure: true,
        user: true,
        fromEmail: true,
        fromName: true,
        enabled: true,
      },
    })

    // Clear cache so new config is used immediately
    clearSMTPConfigCache(asociatie.id)

    return NextResponse.json({
      success: true,
      config: smtpConfig,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error updating SMTP config:', error)
    return NextResponse.json(
      { error: 'Eroare la salvarea configurației SMTP' },
      { status: 500 }
    )
  }
}

// DELETE - Remove SMTP configuration (revert to default Resend)
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id

    // Get user's asociatie
    const asociatie = await db.asociatie.findFirst({
      where: { adminId: userId },
      select: { id: true },
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    // Delete SMTP config
    await db.sMTPConfig.deleteMany({
      where: { asociatieId: asociatie.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting SMTP config:', error)
    return NextResponse.json(
      { error: 'Eroare la ștergerea configurației SMTP' },
      { status: 500 }
    )
  }
}
