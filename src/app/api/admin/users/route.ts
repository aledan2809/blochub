import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isSuperAdmin, hashPassword } from '@/lib/auth'
import { db } from '@/lib/db'

// GET all users (Super Admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    if (!isSuperAdmin(session)) {
      return NextResponse.json({ error: 'Acces interzis - doar Super Admin' }, { status: 403 })
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        asociatiiAdmin: {
          select: {
            id: true,
            nume: true,
          }
        },
        _count: {
          select: {
            apartamente: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Admin users error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// PUT - Update user (Super Admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    if (!isSuperAdmin(session)) {
      return NextResponse.json({ error: 'Acces interzis - doar Super Admin' }, { status: 403 })
    }

    const body = await request.json()
    const { id, password, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'ID utilizator lipsă' }, { status: 400 })
    }

    // Build update payload
    const updatePayload: any = { ...updateData }

    // If password is provided, hash it
    if (password && password.length >= 6) {
      updatePayload.password = await hashPassword(password)
    }

    const user = await db.user.update({
      where: { id },
      data: updatePayload,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Admin update user error:', error)
    return NextResponse.json({ error: 'Eroare la actualizare' }, { status: 500 })
  }
}

// DELETE - Delete user (Super Admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    if (!isSuperAdmin(session)) {
      return NextResponse.json({ error: 'Acces interzis - doar Super Admin' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID utilizator lipsă' }, { status: 400 })
    }

    // Prevent deleting yourself
    if (id === (session.user as any).id) {
      return NextResponse.json({ error: 'Nu poți șterge propriul cont' }, { status: 400 })
    }

    await db.user.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin delete user error:', error)
    return NextResponse.json({ error: 'Eroare la ștergere' }, { status: 500 })
  }
}

// POST - Create user (Super Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    if (!isSuperAdmin(session)) {
      return NextResponse.json({ error: 'Acces interzis - doar Super Admin' }, { status: 403 })
    }

    const body = await request.json()
    const { email, name, phone, password, role } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email și parolă sunt obligatorii' }, { status: 400 })
    }

    // Check if email exists
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email-ul există deja' }, { status: 400 })
    }

    const hashedPassword = await hashPassword(password)

    const user = await db.user.create({
      data: {
        email,
        name,
        phone,
        password: hashedPassword,
        role: role || 'ADMIN',
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      }
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Admin create user error:', error)
    return NextResponse.json({ error: 'Eroare la creare' }, { status: 500 })
  }
}
