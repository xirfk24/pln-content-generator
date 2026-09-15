'use client'

import { apiFetch } from '@/lib/api'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { Select } from '@/components/ui/select'
import { ROLE_LABELS } from '@/constants'
import { formatDate } from '@/lib/utils'
import type { UserRole } from '@/types'

interface UserProfile {
  id: string
  email: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string
}

const ROLES: UserRole[] = ['ADMIN', 'STAFF']

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/admin/users')
      const data = await res.json()
      if (res.ok) {
        setUsers(data.users || [])
      } else {
        setError(data.error || 'Failed to load users')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function updateUser(userId: string, payload: Partial<UserProfile>) {
    try {
      const res = await apiFetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...payload }),
      })

      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Failed to update user')
        return
      }
      load()
    } catch {
      alert('Network error')
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner Penjelasan Modul */}
      <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-gray-50 p-4 text-xs text-slate-900 shadow-sm sm:text-sm">
        <p className="font-semibold text-slate-950">
          👥 Modul Manajemen Pengguna & Hak Akses
        </p>
        <p className="mt-1 text-xs text-slate-600">
          Kelola hak akses (Admin / Staff) serta status keaktifan pengguna dalam sistem PLN Content Management System Divisi Humas PLN UID Jawa Barat.
        </p>
      </div>

      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Manajemen Pengguna</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Kelola peran dan hak akses pengguna sistem. Pendaftaran akun baru dilakukan melalui autentikasi internal.
        </p>
      </div>

      {error && <div className="rounded-md bg-danger-soft p-3 text-sm text-danger">{error}</div>}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-12 text-center text-sm text-ink-muted">
              Tidak ada profil pengguna yang ditemukan.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-surface-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Pengguna</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Peran (Role)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Terdaftar</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-surface-muted">
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink">{user.full_name || '-'}</div>
                        <div className="text-xs text-ink-secondary">{user.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={user.role}
                          onChange={(e) => updateUser(user.id, { role: e.target.value })}
                          className="w-full sm:w-40"
                          aria-label={`Ubah peran untuk ${user.email ?? user.id}`}
                        >
                          {ROLES.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => updateUser(user.id, { is_active: !user.is_active })}
                          className="cursor-pointer"
                          title="Klik untuk mengubah status aktif"
                        >
                          <Badge variant={user.is_active ? 'success' : 'secondary'}>
                            {user.is_active ? 'Aktif' : 'Non-aktif'}
                          </Badge>
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary">
                        {formatDate(user.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
