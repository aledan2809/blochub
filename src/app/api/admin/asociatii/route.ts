import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isSuperAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

// GET all associations (Super Admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    if (!isSuperAdmin(session)) {
      return NextResponse.json({ error: 'Acces interzis - doar Super Admin' }, { status: 403 })
    }

    const asociatii = await db.asociatie.findMany({
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          }
        },
        _count: {
          select: {
            apartamente: true,
            cheltuieli: true,
            chitante: true,
            furnizori: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ asociatii })
  } catch (error) {
    console.error('Admin asociatii error:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

// PUT - Update association (Super Admin only)
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
    const { id, adminId, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'ID asociație lipsă' }, { status: 400 })
    }

    const updatePayload: any = { ...updateData }

    // If changing admin, verify the new admin exists
    if (adminId) {
      const newAdmin = await db.user.findUnique({ where: { id: adminId } })
      if (!newAdmin) {
        return NextResponse.json({ error: 'Administratorul specificat nu există' }, { status: 400 })
      }
      updatePayload.adminId = adminId
    }

    const asociatie = await db.asociatie.update({
      where: { id },
      data: updatePayload,
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    return NextResponse.json({ asociatie })
  } catch (error) {
    console.error('Admin update asociatie error:', error)
    return NextResponse.json({ error: 'Eroare la actualizare' }, { status: 500 })
  }
}

// DELETE - Delete association (Super Admin only)
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
      return NextResponse.json({ error: 'ID asociație lipsă' }, { status: 400 })
    }

    await db.asociatie.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin delete asociatie error:', error)
    return NextResponse.json({ error: 'Eroare la ștergere' }, { status: 500 })
  }
}
