'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black tracking-[0.15em] text-[#00FF94] text-glow-neon uppercase">
            TETSUO CUT
          </h1>
          <p className="text-[#A0A0A0] text-sm mt-2 tracking-widest uppercase">
            silence removed. precision kept.
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Sign in</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-[#A0A0A0] mb-2" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white placeholder-[#555] text-sm focus:border-[#00FF94] focus:outline-none transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm text-[#A0A0A0] mb-2" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white placeholder-[#555] text-sm focus:border-[#00FF94] focus:outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00FF94] text-black font-bold py-3 rounded-lg hover:bg-[#00e085] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm tracking-wide"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-[#A0A0A0] mt-6">
            No account?{' '}
            <Link href="/signup" className="text-[#00FF94] hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
