'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-white">PLN</span>
          </div>
          <CardTitle className="text-2xl">Content Management System</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@pln.co.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="rounded-md bg-danger-soft p-3 text-sm text-danger">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-6 rounded-md bg-primary-soft p-4">
            <p className="text-sm font-medium text-primary">
              Demo Accounts (password: <code className="rounded bg-primary-soft px-1">demo1234</code>)
            </p>
            <div className="mt-2 space-y-1 text-xs text-primary">
              {[
                ['admin@pln.co.id', 'Admin Utama (ADMIN)'],
                ['staff1@pln.co.id', 'Budi Santoso (STAFF)'],
                ['staff2@pln.co.id', 'Siti Rahayu (STAFF)'],
                ['reviewer@pln.co.id', 'Agus Wibowo (REVIEWER)'],
                ['approver@pln.co.id', 'Dewi Kusuma (APPROVER)'],
              ].map(([email, label]) => (
                <button
                  key={email}
                  type="button"
                  onClick={() => {
                    setEmail(email)
                    setPassword('demo1234')
                  }}
                  className="block w-full cursor-pointer rounded px-2 py-1 text-left transition-colors hover:bg-primary-border/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <span className="font-medium">{email}</span> — {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-primary/70">
              Click an account to autofill. Requires demo-users.sql to be run.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
