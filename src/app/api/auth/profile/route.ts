import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Numele trebuie să aibă minim 2 caractere').max(100),
  phone: z.string().max(20).optional().nullable(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilizator negăsit' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('GET profile error:', error)
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
    const data = updateProfileSchema.parse(body)

    const updated = await db.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        phone: data.phone || null
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('PUT profile error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
