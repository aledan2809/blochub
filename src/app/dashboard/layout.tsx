'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  Building2,
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  Home,
  Receipt,
  MessageSquare,
  ChevronDown,
  Building,
  Wallet,
  MessageSquarePlus,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Prezentare generală'
  },
  {
    name: 'Clădire',
    href: '/dashboard/cladire',
    icon: Building,
    description: 'Configurare bloc și scări'
  },
  {
    name: 'Apartamente',
    href: '/dashboard/apartamente',
    icon: Home,
    description: 'Gestiune apartamente'
  },
  {
    name: 'Proprietari',
    href: '/dashboard/proprietari',
    icon: Users,
    description: 'Date contact proprietari'
  },
  {
    name: 'Cheltuieli',
    href: '/dashboard/cheltuieli',
    icon: Receipt,
    description: 'Facturi și cheltuieli'
  },
  {
    name: 'Chitanțe',
    href: '/dashboard/chitante',
    icon: FileText,
    description: 'Liste de întreținere'
  },
  {
    name: 'Avizier',
    href: '/dashboard/avizier',
    icon: ClipboardList,
    description: 'Afișaj centralizat'
  },
  {
    name: 'Încasări',
    href: '/dashboard/incasari',
    icon: Wallet,
    description: 'Plăți primite'
  },
  {
    name: 'Sesizări',
    href: '/dashboard/tichete',
    icon: MessageSquarePlus,
    description: 'Tichete și reclamații'
  },
  {
    name: 'Setări',
    href: '/dashboard/setari',
    icon: Settings,
    description: 'Configurare aplicație'
  },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState(0)

  // Get user initials
  const userInitials = session?.user?.name
    ? session.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : session?.user?.email?.slice(0, 2).toUpperCase() || 'AD'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-white border-r transform transition-transform duration-200 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="h-9 w-9 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">BlocHub</span>
            </Link>
            <button
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-100'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <item.icon className={cn('h-5 w-5', isActive ? 'text-blue-600' : 'text-gray-400')} />
                  <div className="flex-1">
                    <div>{item.name}</div>
                    {!isActive && (
                      <div className="text-xs text-gray-400 font-normal">{item.description}</div>
                    )}
                  </div>
                </Link>
              )
            })}
          </nav>

          {/* Help Card */}
          <div className="mx-3 mb-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <h4 className="font-medium text-blue-900 text-sm">Ai nevoie de ajutor?</h4>
            <p className="text-xs text-blue-700 mt-1">
              Asistentul AI te poate ghida pas cu pas.
            </p>
            <Link href="/dashboard/chat">
              <Button size="sm" className="w-full mt-3" variant="outline">
                <MessageSquare className="h-4 w-4 mr-2" />
                Întreabă AI
              </Button>
            </Link>
          </div>

          {/* User section */}
          <div className="p-3 border-t">
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <span className="text-white font-semibold text-sm">{userInitials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {session?.user?.name || 'Administrator'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {session?.user?.email || 'admin@bloc.ro'}
                </p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/auth/login' })}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Deconectare"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex-1 px-4 lg:px-0">
              {/* Breadcrumb or search could go here */}
            </div>

            <div className="flex items-center gap-2">
              <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <Bell className="h-5 w-5" />
                {notifications > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                    {notifications}
                  </span>
                )}
              </button>

              <Link href={`/dashboard/chat?from=${pathname}&help=1`}>
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Ajutor
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
