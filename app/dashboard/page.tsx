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

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const doneJobsWithTiming = jobList.filter(
    (j) => j.status === 'done' && j.processing_started_at && j.processing_finished_at
  )
  const avgProcessingTime =
    doneJobsWithTiming.length > 0
      ? Math.round(
          doneJobsWithTiming.reduce(
            (sum, j) =>
              sum +
              (new Date(j.processing_finished_at!).getTime() -
                new Date(j.processing_started_at!).getTime()) /
                1000,
            0
          ) / doneJobsWithTiming.length
        )
      : null

  return (
    <main className="max-w-5xl mx-auto px-8 py-8 space-y-8">
      <div>
        <p className="text-[#555] text-sm uppercase tracking-widest">{greeting}</p>
        <h2 className="text-white text-2xl font-bold mt-1">All Files</h2>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#111] border border-[#2A2A2A] rounded-xl p-4">
          <p className="text-[#00FF94] text-2xl font-bold">{doneCount}</p>
          <p className="text-[#555] text-xs mt-1 uppercase tracking-wider">Files processed</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-xl p-4">
          <p className="text-white text-2xl font-bold">{queueCount}</p>
          <p className="text-[#555] text-xs mt-1 uppercase tracking-wider">Still in queue</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-xl p-4">
          <p className="text-[#A0A0A0] text-2xl font-bold">
            {avgProcessingTime != null ? `${avgProcessingTime}s` : '--'}
          </p>
          <p className="text-[#555] text-xs mt-1 uppercase tracking-wider">Avg processing time</p>
        </div>
      </div>

      {/* DropZone + JobList via client wrapper */}
      <DashboardClient userId={user.id} initialJobs={jobList} />
    </main>
  )
}
