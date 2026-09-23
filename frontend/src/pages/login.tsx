'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from '@/compat/next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react'

import { PLNLogo } from '@/components/ui/pln-logo'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Session persistence check
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session
      const isValid = session && session.expires_at
        ? session.expires_at * 1000 > Date.now()
        : false
      if (isValid) {
        router.replace('/dashboard')
        return
      }
      setChecking(false)
    })
  }, [supabase, router])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Memuat sesi...</span>
        </div>
      </div>
    )
  }

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
      setError(err instanceof Error ? err.message : 'Login gagal. Periksa kembali email dan password Anda.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-100/80 p-4 lg:p-8 dark:bg-slate-950">
      {/* Outer Card Container */}
      <div className="flex w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-200/60 border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 dark:shadow-none min-h-[620px]">
        
        {/* LEFT COLUMN: Hero & Branding Section */}
        <div className="relative hidden w-1/2 flex-col justify-between bg-gradient-to-b from-sky-50/70 via-white to-blue-50/50 p-8 lg:flex lg:p-10 border-r border-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/20 dark:border-slate-800">
          {/* Official Brand Logo */}
          <div className="flex items-center gap-3">
            <PLNLogo showText={true} className="h-9 w-auto" />
            <div className="h-7 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                Content Manager
              </span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                UID Jawa Barat
              </span>
            </div>
          </div>

          {/* Catchy Headline */}
          <div className="my-auto space-y-3 pt-6">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 lg:text-4xl dark:text-white leading-[1.15]">
              Unlock Your <br />
              Team <span className="text-[#00A3A6] dark:text-teal-400">Performance</span>
            </h1>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed dark:text-slate-400">
              Platform kolaborasi terpadu perencanaan, kurasi, dan publikasi konten digital resmi PLN UID Jawa Barat.
            </p>

            {/* Team Illustration Asset */}
            <div className="relative pt-4 flex justify-center">
              <img
                src="/images/login-team-hero.jpg"
                alt="PLN Content Team"
                className="w-full max-w-[380px] rounded-2xl object-contain drop-shadow-md"
              />
            </div>
          </div>

          {/* Bottom subtle note */}
          <div className="pt-2 text-[11px] font-medium text-slate-400">
            Humas & Komunikasi Publik &bull; PLN UID Jabar
          </div>
        </div>

        {/* RIGHT COLUMN: Login Form Section */}
        <div className="flex w-full flex-col justify-between p-6 sm:p-10 lg:w-1/2 lg:p-12">
          {/* Mobile Top Brand (Hanya tampil di layar HP) */}
          <div className="flex items-center gap-3 lg:hidden mb-6">
            <PLNLogo showText={true} className="h-8 w-auto" />
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              UID Jawa Barat
            </span>
          </div>

          <div className="my-auto w-full max-w-md mx-auto space-y-6">
            {/* Form Title & Subtitle */}
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                Welcome to Content Manager
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Unlock Your Team Performance
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4 pt-1">
              {/* Email Input */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email address
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@pln.co.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 rounded-xl border-slate-200 bg-white px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus-visible:border-[#00A3A6] focus-visible:ring-[#00A3A6]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 rounded-xl border-slate-200 bg-white px-3.5 pr-10 text-xs text-slate-900 placeholder:text-slate-400 focus-visible:border-[#00A3A6] focus-visible:ring-[#00A3A6]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none dark:hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot password link */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => alert('Silakan hubungi Administrator PLN untuk reset password.')}
                  className="text-xs font-semibold text-slate-500 hover:text-[#00A3A6] transition dark:text-slate-400 dark:hover:text-teal-400"
                >
                  Forgot password?
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:border-rose-900 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-xl bg-[#00A3A6] text-sm font-bold text-white shadow-md shadow-[#00A3A6]/25 hover:bg-[#008d90] transition active:scale-[0.99] disabled:opacity-70"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Login'
                )}
              </Button>

              {/* Register / Help Link */}
              <p className="text-center text-xs text-slate-500 dark:text-slate-400 pt-1">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => alert('Akun dibuat oleh Admin. Silakan hubungi tim IT/Humas PLN.')}
                  className="font-bold text-[#00A3A6] hover:underline dark:text-teal-400"
                >
                  Register
                </button>
              </p>
            </form>
          </div>

          {/* Footer Copyright */}
          <div className="pt-6 text-center text-[11px] text-slate-400 dark:text-slate-600">
            &copy; 2026 PT PLN (Persero) UID Jawa Barat. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  )
}
