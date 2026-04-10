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

  return (
    <main className="max-w-5xl mx-auto px-8 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: typedProject.color }}
        />
        <div>
          <h2 className="text-white text-xl font-semibold">{typedProject.name}</h2>
          <p className="text-[#555] text-sm mt-0.5">
            {jobList.length} file{jobList.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <DashboardClient userId={user.id} initialJobs={jobList} projectId={params.projectId} />
    </main>
  )
}
