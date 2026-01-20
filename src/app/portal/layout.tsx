'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2,
  Home,
  FileText,
  CreditCard,
  Gauge,
  Bell,
  MessageSquare,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Acasă', href: '/portal', icon: Home },
  { name: 'Chitanțe', href: '/portal/chitante', icon: FileText },
  { name: 'Plăți', href: '/portal/plati', icon: CreditCard },
  { name: 'Contoare', href: '/portal/contoare', icon: Gauge },
  { name: 'Notificări', href: '/portal/notificari', icon: Bell },
]

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/portal" className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-blue-600" />
              <span className="font-bold text-lg">BlocHub</span>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href="/portal/chat"
                className="p-2 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-gray-100"
              >
                <MessageSquare className="h-5 w-5" />
              </Link>
              <Link
                href="/portal/setari"
                className="p-2 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-gray-100"
              >
                <Settings className="h-5 w-5" />
              </Link>
              <button className="p-2 text-gray-600 hover:text-red-600 rounded-lg hover:bg-gray-100">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t md:hidden">
        <div className="flex justify-around py-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 text-xs',
                  isActive ? 'text-blue-600' : 'text-gray-600'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
