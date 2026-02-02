'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Users,
  Shield,
  Trash2,
  Pencil,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Home,
  Mail,
  Phone,
  Calendar,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Asociatie {
  id: string
  nume: string
  cui: string | null
  adresa: string
  oras: string
  judet: string
  email: string | null
  telefon: string | null
  createdAt: string
  admin: {
    id: string
    name: string | null
    email: string
    phone: string | null
  }
  _count: {
    apartamente: number
    cheltuieli: number
    chitante: number
    furnizori: number
  }
}

interface User {
  id: string
  email: string
  name: string | null
  phone: string | null
  role: string
  createdAt: string
  updatedAt: string
  asociatiiAdmin: Array<{
    id: string
    nume: string
  }>
  _count: {
    apartamente: number
  }
}

// Modal pentru editare utilizator
function EditUserModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  user: User | null
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'ADMIN',
    password: '',
  })

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        password: '',
      })
    }
  }, [user])

  if (!isOpen || !user) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          ...formData,
          password: formData.password || undefined,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        onSuccess()
        onClose()
      } else {
        setError(data.error || 'Eroare la salvare')
      }
    } catch (err) {
      setError('Eroare de conexiune')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Editare utilizator</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nume</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="PROPRIETAR">Proprietar</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parolă nouă (opțional)
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Lasă gol pentru a păstra parola actuală"
              minLength={6}
            />
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

// Modal pentru editare asociație
function EditAsociatieModal({
  isOpen,
  onClose,
  asociatie,
  users,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  asociatie: Asociatie | null
  users: User[]
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    nume: '',
    cui: '',
    adresa: '',
    oras: '',
    judet: '',
    email: '',
    telefon: '',
    adminId: '',
  })

  useEffect(() => {
    if (asociatie) {
      setFormData({
        nume: asociatie.nume,
        cui: asociatie.cui || '',
        adresa: asociatie.adresa,
        oras: asociatie.oras,
        judet: asociatie.judet,
        email: asociatie.email || '',
        telefon: asociatie.telefon || '',
        adminId: asociatie.admin.id,
      })
    }
  }, [asociatie])

  if (!isOpen || !asociatie) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/asociatii', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: asociatie.id,
          ...formData,
          cui: formData.cui || null,
          email: formData.email || null,
          telefon: formData.telefon || null,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        onSuccess()
        onClose()
      } else {
        setError(data.error || 'Eroare la salvare')
      }
    } catch (err) {
      setError('Eroare de conexiune')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Editare asociație</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nume *</label>
            <input
              type="text"
              required
              value={formData.nume}
              onChange={(e) => setFormData({ ...formData, nume: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CUI</label>
            <input
              type="text"
              value={formData.cui}
              onChange={(e) => setFormData({ ...formData, cui: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresa *</label>
            <input
              type="text"
              required
              value={formData.adresa}
              onChange={(e) => setFormData({ ...formData, adresa: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Oraș *</label>
              <input
                type="text"
                required
                value={formData.oras}
                onChange={(e) => setFormData({ ...formData, oras: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Județ *</label>
              <input
                type="text"
                required
                value={formData.judet}
                onChange={(e) => setFormData({ ...formData, judet: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input
                type="text"
                value={formData.telefon}
                onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Administrator *</label>
            <select
              value={formData.adminId}
              onChange={(e) => setFormData({ ...formData, adminId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email} ({user.email})
                </option>
              ))}
            </select>
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

// Modal confirmare ștergere
function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  loading,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  loading: boolean
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Anulează
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Se șterge...' : 'Șterge'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'asociatii' | 'users'>('asociatii')
  const [loading, setLoading] = useState(true)
  const [asociatii, setAsociatii] = useState<Asociatie[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Modals
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editingAsociatie, setEditingAsociatie] = useState<Asociatie | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'user' | 'asociatie'; id: string; name: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Check if user is super admin
  const isSuperAdmin = (session?.user as any)?.role === 'SUPER_ADMIN'

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    } else if (status === 'authenticated' && !isSuperAdmin) {
      router.push('/dashboard')
    }
  }, [status, isSuperAdmin, router])

  useEffect(() => {
    if (isSuperAdmin) {
      fetchData()
    }
  }, [isSuperAdmin])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [asociatiiRes, usersRes] = await Promise.all([
        fetch('/api/admin/asociatii'),
        fetch('/api/admin/users'),
      ])

      const asociatiiData = await asociatiiRes.json()
      const usersData = await usersRes.json()

      if (asociatiiRes.ok) setAsociatii(asociatiiData.asociatii || [])
      if (usersRes.ok) setUsers(usersData.users || [])
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    setDeleteLoading(true)
    try {
      const endpoint = deleteTarget.type === 'user' ? '/api/admin/users' : '/api/admin/asociatii'
      const res = await fetch(`${endpoint}?id=${deleteTarget.id}`, { method: 'DELETE' })

      if (res.ok) {
        fetchData()
        setDeleteTarget(null)
      }
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setDeleteLoading(false)
    }
  }

  const toggleRowExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Filter data based on search
  const filteredAsociatii = asociatii.filter(
    (a) =>
      a.nume.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.adresa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.admin.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Shield className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Acces restricționat</h2>
        <p className="text-gray-500">Doar Super Admin poate accesa această pagină.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Shield className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Super Admin</h1>
            <p className="text-sm text-gray-500">Administrare completă a platformei</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{asociatii.length}</p>
              <p className="text-sm text-gray-500">Asociații</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              <p className="text-sm text-gray-500">Utilizatori</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length}
              </p>
              <p className="text-sm text-gray-500">Admini</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Home className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {asociatii.reduce((acc, a) => acc + a._count.apartamente, 0)}
              </p>
              <p className="text-sm text-gray-500">Apartamente</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white rounded-xl border mb-4">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('asociatii')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'asociatii'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Building2 className="h-4 w-4 inline mr-2" />
              Asociații ({asociatii.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'users'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Utilizatori ({users.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Caută..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {activeTab === 'asociatii' ? (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Asociație
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Administrator
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Statistici
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Creat
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Acțiuni
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredAsociatii.map((asociatie) => (
                  <>
                    <tr key={asociatie.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleRowExpand(asociatie.id)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            {expandedRows.has(asociatie.id) ? (
                              <ChevronUp className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                          <div>
                            <p className="font-medium text-gray-900">{asociatie.nume}</p>
                            <p className="text-sm text-gray-500">
                              {asociatie.adresa}, {asociatie.oras}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                              {asociatie.admin.name?.charAt(0) || asociatie.admin.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {asociatie.admin.name || 'Fără nume'}
                            </p>
                            <p className="text-xs text-gray-500">{asociatie.admin.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>{asociatie._count.apartamente} ap.</span>
                          <span>{asociatie._count.furnizori} furn.</span>
                          <span>{asociatie._count.chitante} chit.</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(asociatie.createdAt).toLocaleDateString('ro-RO')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingAsociatie(asociatie)}
                            className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                            title="Editează"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteTarget({
                                type: 'asociatie',
                                id: asociatie.id,
                                name: asociatie.nume,
                              })
                            }
                            className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                            title="Șterge"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRows.has(asociatie.id) && (
                      <tr key={`${asociatie.id}-details`} className="bg-gray-50">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">CUI:</span>{' '}
                              <span className="font-medium">{asociatie.cui || '-'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Județ:</span>{' '}
                              <span className="font-medium">{asociatie.judet}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Email:</span>{' '}
                              <span className="font-medium">{asociatie.email || '-'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Telefon:</span>{' '}
                              <span className="font-medium">{asociatie.telefon || '-'}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {filteredAsociatii.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Nu s-au găsit asociații
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Utilizator
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Rol
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Asociații administrate
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Creat
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Acțiuni
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name || 'Fără nume'}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Phone className="h-3 w-3" />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          user.role === 'SUPER_ADMIN' && 'bg-purple-100 text-purple-700',
                          user.role === 'ADMIN' && 'bg-blue-100 text-blue-700',
                          user.role === 'PROPRIETAR' && 'bg-gray-100 text-gray-700'
                        )}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.asociatiiAdmin.length > 0 ? (
                        <div className="space-y-1">
                          {user.asociatiiAdmin.map((a) => (
                            <span
                              key={a.id}
                              className="inline-block px-2 py-1 bg-gray-100 rounded text-xs mr-1"
                            >
                              {a.nume}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(user.createdAt).toLocaleDateString('ro-RO')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                          title="Editează"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {user.id !== (session?.user as any)?.id && (
                          <button
                            onClick={() =>
                              setDeleteTarget({
                                type: 'user',
                                id: user.id,
                                name: user.name || user.email,
                              })
                            }
                            className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                            title="Șterge"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Nu s-au găsit utilizatori
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modals */}
      <EditUserModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        user={editingUser}
        onSuccess={fetchData}
      />

      <EditAsociatieModal
        isOpen={!!editingAsociatie}
        onClose={() => setEditingAsociatie(null)}
        asociatie={editingAsociatie}
        users={users}
        onSuccess={fetchData}
      />

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={deleteTarget?.type === 'user' ? 'Șterge utilizator' : 'Șterge asociație'}
        message={`Ești sigur că vrei să ștergi ${deleteTarget?.type === 'user' ? 'utilizatorul' : 'asociația'} "${deleteTarget?.name}"? Această acțiune este ireversibilă.`}
        loading={deleteLoading}
      />
    </div>
  )
}
