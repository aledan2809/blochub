import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, hashPassword } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Token lipsă'),
  name: z.string().min(2, 'Numele trebuie să aibă minim 2 caractere'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Parola trebuie să aibă minim 6 caractere').optional(),
})

// GET - Validate token and get invitation details (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token lipsă' }, { status: 400 })
    }

    const invitation = await db.invitationToken.findUnique({
      where: { token },
      include: {
        asociatie: {
          select: { nume: true, adresa: true, oras: true },
        },
        apartament: {
          select: { numar: true },
        },
        invitedBy: {
          select: { name: true },
        },
      },
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitație invalidă' }, { status: 404 })
    }

    if (invitation.usedAt) {
      return NextResponse.json({ error: 'Invitația a fost deja folosită' }, { status: 400 })
    }

    if (invitation.expires < new Date()) {
      return NextResponse.json({ error: 'Invitația a expirat' }, { status: 400 })
    }

    // Check if user with this email already exists
    const existingUser = await db.user.findUnique({
      where: { email: invitation.email },
    })

    return NextResponse.json({
      valid: true,
      invitation: {
        email: invitation.email,
        numeInvitat: invitation.numeInvitat,
        asociatie: invitation.asociatie,
        apartament: invitation.apartament,
        invitedBy: invitation.invitedBy,
      },
      userExists: !!existingUser,
    })
  } catch (error) {
    console.error('Error validating invitation:', error)
    return NextResponse.json(
      { error: 'Eroare la validarea invitației' },
      { status: 500 }
    )
  }
}

// POST - Accept invitation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = acceptInvitationSchema.parse(body)

    // Get invitation
    const invitation = await db.invitationToken.findUnique({
      where: { token: data.token },
      include: {
        asociatie: { select: { id: true } },
      },
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitație invalidă' }, { status: 404 })
    }

    if (invitation.usedAt) {
      return NextResponse.json({ error: 'Invitația a fost deja folosită' }, { status: 400 })
    }

    if (invitation.expires < new Date()) {
      return NextResponse.json({ error: 'Invitația a expirat' }, { status: 400 })
    }

    // Check if user exists
    let user = await db.user.findUnique({
      where: { email: invitation.email },
    })

    if (user) {
      // User exists - just update their name/phone if provided
      if (data.name || data.phone) {
        user = await db.user.update({
          where: { id: user.id },
          data: {
            name: data.name || user.name,
            phone: data.phone || user.phone,
          },
        })
      }
    } else {
      // Create new user
      if (!data.password) {
        return NextResponse.json(
          { error: 'Parola este obligatorie pentru utilizatori noi' },
          { status: 400 }
        )
      }

      const hashedPassword = await hashPassword(data.password)

      user = await db.user.create({
        data: {
          email: invitation.email,
          name: data.name,
          phone: data.phone || null,
          password: hashedPassword,
          role: 'PROPRIETAR',
        },
      })
    }

    // Link user to apartment if specified
    if (invitation.apartamentId) {
      // Check if already linked
      const existingLink = await db.proprietarApartament.findUnique({
        where: {
          userId_apartamentId: {
            userId: user.id,
            apartamentId: invitation.apartamentId,
          },
        },
      })

      if (!existingLink) {
        await db.proprietarApartament.create({
          data: {
            userId: user.id,
            apartamentId: invitation.apartamentId,
            cotaParte: 100,
            esteActiv: true,
          },
        })
      }
    }

    // Mark invitation as used
    await db.invitationToken.update({
      where: { id: invitation.id },
      data: { usedAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      message: 'Invitație acceptată cu succes!',
      isNewUser: !!(data.password), // If password was needed, it's a new user
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error accepting invitation:', error)
    return NextResponse.json(
      { error: 'Eroare la acceptarea invitației' },
      { status: 500 }
    )
  }
}
