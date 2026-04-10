import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Job, Project } from '@/lib/types'
import DashboardClient from '@/components/dashboard/DashboardClient'

export default async function ProjectPage({ params }: { params: { projectId: string } }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Load project (verify ownership)
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) redirect('/dashboard')

  const typedProject = project as Project

  // Load jobs for this project only
  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', user.id)
    .eq('project_id', params.projectId)
    .order('created_at', { ascending: false })
    .limit(50)

  const jobList = (jobs as Job[]) ?? []
  const doneCount = jobList.filter(j => j.status === 'done').length

  return (
    <main className="max-w-5xl mx-auto px-8 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${typedProject.color}20`, boxShadow: `0 0 20px ${typedProject.color}30` }}
          >
            <span className="w-4 h-4 rounded-full" style={{ backgroundColor: typedProject.color }} />
          </div>
          <div>
            <h2 className="text-white text-xl font-bold">{typedProject.name}</h2>
            <p className="text-[#666] text-sm mt-0.5">
              {doneCount} processed · {jobList.length} total
            </p>
          </div>
        </div>
      </div>

      <DashboardClient userId={user.id} initialJobs={jobList} projectId={params.projectId} />
    </main>
  )
}
