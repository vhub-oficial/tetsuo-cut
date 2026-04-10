import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Job } from '@/lib/types'
import DashboardClient from '@/components/dashboard/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Load most recent 50 jobs (all projects)
  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const jobList = (jobs as Job[]) ?? []

  // Stats
  const doneCount = jobList.filter((j) => j.status === 'done').length
  const queueCount = jobList.filter(
    (j) => j.status === 'pending' || j.status === 'processing'
  ).length

  return (
    <main className="max-w-5xl mx-auto px-8 py-8 space-y-8">
      <div>
        <h2 className="text-white text-xl font-semibold">All Files</h2>
        <p className="text-[#555] text-sm mt-1">Every audio file you&apos;ve processed</p>
      </div>

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
      <DashboardClient userId={user.id} initialJobs={jobList} />
    </main>
  )
}
