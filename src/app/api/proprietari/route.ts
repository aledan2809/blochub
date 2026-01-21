import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id

    const { searchParams } = new URL(request.url)
    const asociatieId = searchParams.get('asociatieId')

    // Get user's association if not provided
    let association
    if (asociatieId) {
      association = await db.asociatie.findFirst({
        where: { id: asociatieId, adminId: userId }
      })
    } else {
      association = await db.asociatie.findFirst({
        where: { adminId: userId }
      })
    }

    if (!association) {
      return NextResponse.json({ error: 'Asociație negăsită' }, { status: 404 })
    }

    // Get all proprietari linked to apartments in this association
    const proprietari = await db.proprietarApartament.findMany({
      where: {
        apartament: { asociatieId: association.id }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        apartament: {
          select: {
            id: true,
            numar: true,
            scara: { select: { numar: true } }
          }
        }
      },
      orderBy: [
        { apartament: { numar: 'asc' } }
      ]
    })

    return NextResponse.json({ proprietari, asociatieId: association.id })
  } catch (error) {
    console.error('GET proprietari error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const body = await request.json()

    // Verify user owns the association that owns the apartment
    const apartament = await db.apartament.findFirst({
      where: { id: body.apartamentId },
      include: { asociatie: true }
    })

    if (!apartament || apartament.asociatie.adminId !== userId) {
      return NextResponse.json({ error: 'Apartament negăsit' }, { status: 404 })
    }

    // Check if user already exists by email
    let proprietarUser = await db.user.findUnique({
      where: { email: body.email }
    })

    if (!proprietarUser) {
      // Create new user
      proprietarUser = await db.user.create({
        data: {
          email: body.email,
          name: body.name,
          phone: body.phone || null,
          role: 'PROPRIETAR'
        }
      })
    } else {
      // Update existing user info if provided
      if (body.name || body.phone) {
        proprietarUser = await db.user.update({
          where: { id: proprietarUser.id },
          data: {
            name: body.name || proprietarUser.name,
            phone: body.phone || proprietarUser.phone
          }
        })
      }
    }

    // Check if already linked to this apartment
    const existingLink = await db.proprietarApartament.findUnique({
      where: {
        userId_apartamentId: {
          userId: proprietarUser.id,
          apartamentId: body.apartamentId
        }
      }
    })

    if (existingLink) {
      return NextResponse.json({
        error: 'Proprietarul este deja asociat acestui apartament'
      }, { status: 400 })
    }

    // Create link
    const proprietarApartament = await db.proprietarApartament.create({
      data: {
        userId: proprietarUser.id,
        apartamentId: body.apartamentId,
        cotaParte: body.cotaParte || 100,
        esteActiv: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        apartament: {
          select: {
            id: true,
            numar: true,
            scara: { select: { numar: true } }
          }
        }
      }
    })

    return NextResponse.json({ proprietar: proprietarApartament }, { status: 201 })
  } catch (error) {
    console.error('POST proprietar error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const body = await request.json()

    // Get the proprietar-apartament link
    const existingLink = await db.proprietarApartament.findUnique({
      where: { id: body.id },
      include: {
        apartament: { include: { asociatie: true } },
        user: true
      }
    })

    if (!existingLink || existingLink.apartament.asociatie.adminId !== userId) {
      return NextResponse.json({ error: 'Proprietar negăsit' }, { status: 404 })
    }

    // Update user info
    await db.user.update({
      where: { id: existingLink.userId },
      data: {
        name: body.name,
        phone: body.phone
      }
    })

    // Update link
    const updated = await db.proprietarApartament.update({
      where: { id: body.id },
      data: {
        cotaParte: body.cotaParte,
        esteActiv: body.esteActiv
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        apartament: {
          select: {
            id: true,
            numar: true,
            scara: { select: { numar: true } }
          }
        }
      }
    })

    return NextResponse.json({ proprietar: updated })
  } catch (error) {
    console.error('PUT proprietar error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

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
      return NextResponse.json({ error: 'ID necesar' }, { status: 400 })
    }

    // Verify ownership
    const link = await db.proprietarApartament.findUnique({
      where: { id },
      include: {
        apartament: { include: { asociatie: true } }
      }
    })

    if (!link || link.apartament.asociatie.adminId !== userId) {
      return NextResponse.json({ error: 'Proprietar negăsit' }, { status: 404 })
    }

    await db.proprietarApartament.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE proprietar error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
