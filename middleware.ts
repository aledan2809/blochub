import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // Admin routes require SUPER_ADMIN role
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      if (token?.role !== 'SUPER_ADMIN') {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Acces interzis - doar Super Admin' },
            { status: 403 }
          )
        }
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Proprietarii folosesc portalul, nu dashboard-ul de admin (G-BLOC-019)
    if (pathname.startsWith('/dashboard') && token?.role === 'PROPRIETAR') {
      return NextResponse.redirect(new URL('/portal', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Public: invite verification + acceptance — the invitee has no session
        // yet (the whole point of accepting an invitation). Gating it broke the
        // entire proprietar onboarding flow. (G-BLOC-015)
        if (req.nextUrl.pathname === '/api/invitations/accept') return true
        return !!token
      },
    },
  }
)

// Protect all dashboard and API routes except public ones
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    // API routes that require auth (exclude public ones)
    '/api/admin/:path*',
    '/api/apartamente/:path*',
    '/api/asociatii/:path*',
    '/api/asociatie/:path*',
    '/api/cheltuieli/:path*',
    '/api/chitante/:path*',
    '/api/cladire/:path*',
    '/api/conturi-bancare/:path*',
    '/api/dashboard/:path*',
    '/api/export/:path*',
    '/api/fonduri/:path*',
    '/api/furnizori/:path*',
    '/api/import/:path*',
    '/api/incasari/:path*',
    '/api/invitations/:path*',
    '/api/plati-bancare/:path*',
    '/api/plati-furnizori/:path*',
    '/api/portal/:path*',
    '/api/proprietari/:path*',
    '/api/rapoarte/:path*',
    '/api/scari/:path*',
    '/api/spv/:path*',
    '/api/tichete/:path*',
    '/api/tipuri-apartament/:path*',
    '/api/tipuri-cheltuieli/:path*',
    '/api/user/:path*',
    '/api/avizier/:path*',
    '/api/agents/:path*',
    '/api/chat-feedback/:path*',
    '/api/verificare-anaf/:path*',
    '/api/audit/:path*',
  ],
}
