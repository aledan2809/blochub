import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { sendEmail, emailTemplates } from '@/lib/email'

const createTichetSchema = z.object({
  titlu: z.string().min(5, 'Titlul trebuie să aibă minim 5 caractere'),
  descriere: z.string().min(10, 'Descrierea trebuie să aibă minim 10 caractere'),
  categorie: z.enum(['DEFECTIUNE', 'CURATENIE', 'ZGOMOT', 'PARCARE', 'ILUMINAT', 'SUGGESTIE', 'FINANCIAR', 'ALTELE']),
  prioritate: z.enum(['SCAZUTA', 'NORMALA', 'URGENTA']).optional(),
  locatie: z.string().optional(),
  imagini: z.array(z.string()).optional(),
})

// GET - List tichete
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const categorie = searchParams.get('categorie')

    // Check if user is admin
    const asociatie = await db.asociatie.findFirst({
      where: { adminId: userId }
    })

    let tichete

    if (asociatie) {
      // Admin sees all tichete for their asociatie
      tichete = await db.tichet.findMany({
        where: {
          asociatieId: asociatie.id,
          ...(status && status !== 'ALL' ? { status: status as any } : {}),
          ...(categorie && categorie !== 'ALL' ? { categorie: categorie as any } : {}),
        },
        include: {
          creator: {
            select: { id: true, name: true, email: true }
          },
          asignat: {
            select: { id: true, name: true }
          },
          _count: {
            select: { comentarii: true }
          }
        },
        orderBy: [
          { status: 'asc' },
          { prioritate: 'desc' },
          { createdAt: 'desc' }
        ]
      })
    } else {
      // Proprietar sees only their tichete
      const proprietar = await db.proprietarApartament.findFirst({
        where: { userId, esteActiv: true },
        include: { apartament: true }
      })

      if (!proprietar) {
        return NextResponse.json({ tichete: [] })
      }

      tichete = await db.tichet.findMany({
        where: {
          creatorId: userId,
          asociatieId: proprietar.apartament.asociatieId,
        },
        include: {
          _count: {
            select: { comentarii: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    return NextResponse.json({ tichete, isAdmin: !!asociatie })
  } catch (error) {
    console.error('Error fetching tichete:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// POST - Create tichet
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const body = await request.json()
    const data = createTichetSchema.parse(body)

    // Find user's asociatie and get creator info for notifications
    let asociatieId: string | null = null
    let apartamentNumar: string | undefined
    let adminEmail: string | undefined

    // Check if admin
    const asociatieAdmin = await db.asociatie.findFirst({
      where: { adminId: userId },
      include: { admin: { select: { email: true } } }
    })

    if (asociatieAdmin) {
      asociatieId = asociatieAdmin.id
      adminEmail = asociatieAdmin.admin.email || undefined
    } else {
      // Check if proprietar
      const proprietar = await db.proprietarApartament.findFirst({
        where: { userId, esteActiv: true },
        include: {
          apartament: {
            include: {
              asociatie: {
                include: { admin: { select: { email: true } } }
              }
            }
          }
        }
      })

      if (proprietar) {
        asociatieId = proprietar.apartament.asociatieId
        apartamentNumar = proprietar.apartament.numar
        adminEmail = proprietar.apartament.asociatie.admin.email || undefined
      }
    }

    if (!asociatieId) {
      return NextResponse.json(
        { error: 'Nu aparții niciunei asociații' },
        { status: 400 }
      )
    }

    // Get next ticket number
    const lastTichet = await db.tichet.findFirst({
      where: { asociatieId },
      orderBy: { numar: 'desc' }
    })
    const numar = (lastTichet?.numar || 0) + 1

    const tichet = await db.tichet.create({
      data: {
        numar,
        titlu: data.titlu,
        descriere: data.descriere,
        categorie: data.categorie,
        prioritate: data.prioritate || 'NORMALA',
        locatie: data.locatie,
        imagini: data.imagini || [],
        asociatieId,
        creatorId: userId,
      },
      include: {
        creator: {
          select: { name: true, email: true }
        }
      }
    })

    // Send email notification to admin (if ticket created by proprietar)
    if (adminEmail && !asociatieAdmin) {
      const categorieLabels: Record<string, string> = {
        DEFECTIUNE: 'Defecțiune',
        CURATENIE: 'Curățenie',
        ZGOMOT: 'Zgomot',
        PARCARE: 'Parcare',
        ILUMINAT: 'Iluminat',
        SUGGESTIE: 'Sugestie',
        FINANCIAR: 'Financiar',
        ALTELE: 'Altele'
      }

      const prioritateLabels: Record<string, string> = {
        SCAZUTA: 'Scăzută',
        NORMALA: 'Normală',
        URGENTA: 'Urgentă'
      }

      const emailData = emailTemplates.newTicket({
        titlu: tichet.titlu,
        descriere: tichet.descriere,
        categorie: categorieLabels[tichet.categorie] || tichet.categorie,
        prioritate: prioritateLabels[tichet.prioritate] || tichet.prioritate,
        autor: tichet.creator.name || tichet.creator.email || 'Necunoscut',
        apartament: apartamentNumar,
        link: `${process.env.NEXTAUTH_URL || 'https://blochub-cyan.vercel.app'}/dashboard/tichete/${tichet.id}`
      })

      // Send async - don't wait
      sendEmail({
        to: adminEmail,
        subject: emailData.subject,
        html: emailData.html
      }).catch(err => console.error('[Tichet] Email notification failed:', err))
    }

    return NextResponse.json({ tichet })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Error creating tichet:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
