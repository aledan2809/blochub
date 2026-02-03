import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import crypto from 'crypto'
import { sendEmail, emailTemplates } from '@/lib/email'

const createInvitationSchema = z.object({
  email: z.string().email('Email invalid'),
  apartamentId: z.string().optional(),
  numeInvitat: z.string().optional(),
})

// GET - List invitations for current admin's association
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

    const invitations = await db.invitationToken.findMany({
      where: { asociatieId: asociatie.id },
      include: {
        apartament: {
          select: { numar: true },
        },
        invitedBy: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ invitations })
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json(
      { error: 'Eroare la încărcarea invitațiilor' },
      { status: 500 }
    )
  }
}

// POST - Create new invitation and send email
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const body = await request.json()
    const data = createInvitationSchema.parse(body)

    // Get user's asociatie
    const asociatie = await db.asociatie.findFirst({
      where: { adminId: userId },
      select: { id: true, nume: true },
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    // Check if apartament exists in this association
    let apartamentInfo = null
    if (data.apartamentId) {
      apartamentInfo = await db.apartament.findFirst({
        where: {
          id: data.apartamentId,
          asociatieId: asociatie.id,
        },
        select: { id: true, numar: true },
      })

      if (!apartamentInfo) {
        return NextResponse.json({ error: 'Apartament negăsit' }, { status: 404 })
      }
    }

    // Check if there's already a pending invitation for this email
    const existingInvitation = await db.invitationToken.findFirst({
      where: {
        email: data.email,
        asociatieId: asociatie.id,
        usedAt: null,
        expires: { gt: new Date() },
      },
    })

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'Există deja o invitație activă pentru acest email' },
        { status: 400 }
      )
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Create invitation
    const invitation = await db.invitationToken.create({
      data: {
        email: data.email,
        token,
        expires,
        asociatieId: asociatie.id,
        apartamentId: data.apartamentId || null,
        numeInvitat: data.numeInvitat || null,
        invitedById: userId,
      },
      include: {
        apartament: {
          select: { numar: true },
        },
      },
    })

    // Send invitation email
    const inviteUrl = `${process.env.NEXTAUTH_URL || 'https://app.blochub.ro'}/invite/${token}`
    const adminName = (session.user as { name?: string }).name || 'Administrator'

    const emailResult = await sendEmail({
      to: data.email,
      subject: `Invitație BlocHub - ${asociatie.nume}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">BlocHub</h1>
            <p style="color: #6b7280; margin: 5px 0;">Administrare Asociații de Proprietari</p>
          </div>

          <h2 style="color: #1f2937;">Bună${data.numeInvitat ? ` ${data.numeInvitat}` : ''}!</h2>

          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Ai fost invitat de <strong>${adminName}</strong> să te alături asociației
            <strong>${asociatie.nume}</strong> pe platforma BlocHub.
          </p>

          ${apartamentInfo ? `
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Vei fi asociat cu apartamentul <strong>${apartamentInfo.numar}</strong>.
            </p>
          ` : ''}

          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Cu BlocHub poți:
          </p>
          <ul style="color: #4b5563; font-size: 14px; line-height: 1.8;">
            <li>Vizualiza chitanțele și întreținerea lunară</li>
            <li>Plăti online direct din aplicație</li>
            <li>Transmite indexurile contoarelor</li>
            <li>Raporta probleme și sesizări</li>
          </ul>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}"
               style="display: inline-block; background-color: #2563eb; color: white;
                      padding: 14px 28px; text-decoration: none; border-radius: 8px;
                      font-weight: bold; font-size: 16px;">
              Acceptă Invitația
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 13px;">
            Link-ul expiră în 7 zile. Dacă nu ai solicitat această invitație, ignoră acest email.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            Email trimis automat de BlocHub. Nu răspunde la acest email.
          </p>
        </div>
      `,
      asociatieId: asociatie.id,
    })

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        expires: invitation.expires,
        apartament: invitation.apartament,
      },
      emailSent: emailResult.success,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating invitation:', error)
    return NextResponse.json(
      { error: 'Eroare la crearea invitației' },
      { status: 500 }
    )
  }
}

// DELETE - Cancel invitation
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID invitație lipsă' }, { status: 400 })
    }

    // Get user's asociatie
    const asociatie = await db.asociatie.findFirst({
      where: { adminId: userId },
      select: { id: true },
    })

    if (!asociatie) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    // Delete only if it belongs to user's association
    await db.invitationToken.deleteMany({
      where: {
        id,
        asociatieId: asociatie.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting invitation:', error)
    return NextResponse.json(
      { error: 'Eroare la ștergerea invitației' },
      { status: 500 }
    )
  }
}
