import { createClient } from '@/lib/supabase/client'

let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

// apiFetch wraps fetch with the Supabase access token so the Go backend
// can authenticate the request.
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken()
  const headers = new Headers(init.headers || {})
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(input, { ...init, headers })
}
