'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
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
  Plus,
  Check,
  Pencil,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AsociatieProvider, useAsociatie } from '@/contexts/AsociatieContext'

// Modal pentru adăugare clădire nouă
function AddBuildingModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    nume: '',
    adresa: '',
    oras: '',
    judet: '',
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/asociatii', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok && data.asociatie) {
        // Save new asociatie ID and reload
        localStorage.setItem('currentAsociatieId', data.asociatie.id)
        window.location.reload()
      } else {
        setError(data.error || 'Eroare la creare')
      }
    } catch (err) {
      console.error('Error creating asociatie:', err)
      setError('Eroare de conexiune')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold mb-4">Adaugă clădire nouă</h3>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nume asociație *
            </label>
            <input
              type="text"
              required
              value={formData.nume}
              onChange={(e) => setFormData({ ...formData, nume: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="ex: Asociația Bloc A1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresa *
            </label>
            <input
              type="text"
              required
              value={formData.adresa}
              onChange={(e) => setFormData({ ...formData, adresa: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="ex: Str. Exemplu nr. 10"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Oraș *
              </label>
              <input
                type="text"
                required
                value={formData.oras}
                onChange={(e) => setFormData({ ...formData, oras: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="București"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Județ *
              </label>
              <input
                type="text"
                required
                value={formData.judet}
                onChange={(e) => setFormData({ ...formData, judet: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Sector 1"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Anulează
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Se salvează...' : 'Adaugă'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Modal pentru editare clădire
function EditBuildingModal({
  isOpen,
  onClose,
  onSuccess,
  asociatie,
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  asociatie: { id: string; nume: string; adresa: string; oras: string } | null
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    nume: '',
    adresa: '',
    oras: '',
    judet: '',
  })

  useEffect(() => {
    if (asociatie) {
      setFormData({
        nume: asociatie.nume || '',
        adresa: asociatie.adresa || '',
        oras: asociatie.oras || '',
        judet: '',
      })
      // Fetch full data to get judet
      fetch(`/api/asociatii/${asociatie.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.asociatie) {
            setFormData({
              nume: data.asociatie.nume || '',
              adresa: data.asociatie.adresa || '',
              oras: data.asociatie.oras || '',
              judet: data.asociatie.judet || '',
            })
          }
        })
        .catch(() => {})
    }
  }, [asociatie])

  if (!isOpen || !asociatie) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/asociatii/${asociatie.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok) {
        onSuccess()
        onClose()
        window.location.reload()
      } else {
        setError(data.error || 'Eroare la salvare')
      }
    } catch (err) {
      console.error('Error updating asociatie:', err)
      setError('Eroare de conexiune')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold mb-4">Editează asociația</h3>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nume asociație *
            </label>
            <input
              type="text"
              required
              value={formData.nume}
              onChange={(e) => setFormData({ ...formData, nume: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="ex: Asociația Bloc A1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresa *
            </label>
            <input
              type="text"
              required
              value={formData.adresa}
              onChange={(e) => setFormData({ ...formData, adresa: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="ex: Str. Exemplu nr. 10"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Oraș *
              </label>
              <input
                type="text"
                required
                value={formData.oras}
                onChange={(e) => setFormData({ ...formData, oras: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="București"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Județ *
              </label>
              <input
                type="text"
                required
                value={formData.judet}
                onChange={(e) => setFormData({ ...formData, judet: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Sector 1"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Anulează
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Se salvează...' : 'Salvează'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Componenta selector clădiri
function BuildingSelector() {
  const { asociatii, currentAsociatie, setCurrentAsociatie, refreshAsociatii, addAsociatie, loading } = useAsociatie()
  const [isOpen, setIsOpen] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingAsociatie, setEditingAsociatie] = useState<{ id: string; nume: string; adresa: string; oras: string } | null>(null)

  if (loading) {
    return (
      <div className="px-3 py-2 mx-3 mb-2 bg-gray-50 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    )
  }

  if (!currentAsociatie) {
    return (
      <>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3 py-2 mx-3 mb-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors w-[calc(100%-1.5rem)]"
        >
          <Plus className="h-4 w-4" />
          Adaugă prima clădire
        </button>
        <AddBuildingModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={async () => {
            await refreshAsociatii()
          }}
        />
      </>
    )
  }

  return (
    <>
      <div className="relative mx-3 mb-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 hover:border-blue-200 transition-colors"
        >
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {currentAsociatie.nume}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {currentAsociatie.adresa}, {currentAsociatie.oras}
            </p>
          </div>
          <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', isOpen && 'rotate-180')} />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border z-50 py-1 max-h-64 overflow-y-auto">
              {asociatii.map((asociatie) => (
                <div
                  key={asociatie.id}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors',
                    asociatie.id === currentAsociatie.id && 'bg-blue-50'
                  )}
                >
                  <button
                    onClick={() => {
                      setCurrentAsociatie(asociatie)
                      setIsOpen(false)
                    }}
                    className="flex-1 flex items-center gap-3"
                  >
                    <div className="h-7 w-7 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-3.5 w-3.5 text-gray-600" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {asociatie.nume}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {asociatie._count?.apartamente || 0} apartamente
                      </p>
                    </div>
                    {asociatie.id === currentAsociatie.id && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingAsociatie(asociatie)
                      setShowEditModal(true)
                      setIsOpen(false)
                    }}
                    className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Editează"
                  >
                    <Pencil className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                </div>
              ))}
              <div className="border-t mt-1 pt-1">
                <button
                  onClick={() => {
                    setIsOpen(false)
                    setShowAddModal(true)
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <div className="h-7 w-7 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Plus className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm font-medium">Adaugă clădire nouă</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <AddBuildingModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={async () => {
          await refreshAsociatii()
        }}
      />

      <EditBuildingModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingAsociatie(null)
        }}
        onSuccess={async () => {
          await refreshAsociatii()
        }}
        asociatie={editingAsociatie}
      />
    </>
  )
}

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
    description: 'Încasări de la locatari'
  },
  {
    name: 'Plăți',
    href: '/dashboard/plati',
    icon: CreditCard,
    description: 'Plăți către furnizori'
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

function DashboardLayoutContent({
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

          {/* Building Selector */}
          <div className="pt-3">
            <BuildingSelector />
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
        <main className="p-4 md:p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AsociatieProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </AsociatieProvider>
  )
}
