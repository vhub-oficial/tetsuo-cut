import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Job } from '@/lib/types'
import DashboardClient from '@/components/dashboard/DashboardClient'

async function logout() {
  'use server'
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}


export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Load most recent 50 jobs
  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, storage_used_bytes, storage_limit_bytes')
    .eq('id', user.id)
    .single()

  const displayName = profile?.full_name ?? user.email
  const jobList = (jobs as Job[]) ?? []

  // Stats
  const doneCount = jobList.filter((j) => j.status === 'done').length
  const queueCount = jobList.filter(
    (j) => j.status === 'pending' || j.status === 'processing'
  ).length

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="border-b border-[#1A1A1A] bg-[#0A0A0A]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-[0.12em] text-[#00FF94] text-glow-neon uppercase">
              TETSUO CUT
            </h1>
            <p className="text-[#555] text-[10px] tracking-widest uppercase -mt-0.5">
              silence removed. precision kept.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[#A0A0A0] text-sm hidden sm:block truncate max-w-[180px]">
              {displayName}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="text-[#555] hover:text-white text-sm transition-colors border border-[#2A2A2A] hover:border-[#3A3A3A] rounded-lg px-3 py-1.5"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        {/* Stats bar */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#111] border border-[#2A2A2A] rounded-xl p-4">
            <p className="text-[#00FF94] text-2xl font-bold">{doneCount}</p>
            <p className="text-[#555] text-xs mt-1 uppercase tracking-wider">Files processed</p>
          </div>
          <div className="bg-[#111] border border-[#2A2A2A] rounded-xl p-4">
            <p className="text-white text-2xl font-bold">{queueCount}</p>
            <p className="text-[#555] text-xs mt-1 uppercase tracking-wider">Still in queue</p>
          </div>
        </div>

        {/* DropZone + JobList via client wrapper */}
        <DashboardClient
          userId={user.id}
          initialJobs={jobList}
          storageUsed={profile?.storage_used_bytes ?? 0}
          storageLimit={profile?.storage_limit_bytes ?? 524288000}
        />
      </main>
    </div>
  )
}
