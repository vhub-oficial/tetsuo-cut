import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{
        background: '#0A0A0A',
        backgroundImage: `
          linear-gradient(#1A1A1A 1px, transparent 1px),
          linear-gradient(90deg, #1A1A1A 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }}
    >
      <div className="text-center max-w-lg w-full">
        {/* Logo */}
        <h1 className="text-5xl font-black tracking-[0.12em] text-[#00FF94] text-glow-neon uppercase mb-4">
          TETSUO CUT
        </h1>

        {/* Tagline */}
        <p className="text-white text-xl font-semibold mb-3">
          Silence Removed. Precision Kept.
        </p>

        {/* Subtitle */}
        <p className="text-[#A0A0A0] text-sm leading-relaxed mb-10">
          Drop your audio. Get back a clean narration — pauses and breaths removed automatically.
        </p>

        {/* Buttons */}
        <div className="flex gap-4 justify-center">
          <Link
            href="/signup"
            className="px-6 py-3 bg-[#00FF94] text-black text-sm font-bold rounded-xl hover:bg-[#00e085] transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 border border-[#2A2A2A] text-white text-sm rounded-xl hover:border-[#3A3A3A] transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
