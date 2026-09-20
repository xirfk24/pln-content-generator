'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'
import { useRouter } from '@/compat/next'
import { apiFetch } from '@/lib/api'

export default function LogoutPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const logout = async () => {
      try {
        await apiFetch('/api/auth/logout', { method: 'POST' })
      } catch {
        // ignore
      }
      await supabase.auth.signOut()
      router.push('/login')
    }
    logout()
  }, [router, supabase])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Logging out...</p>
    </div>
  )
}
