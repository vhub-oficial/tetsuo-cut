import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Job, Project } from '@/lib/types'
import Link from 'next/link'

// ── Helpers ──────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatBytes(b: number): string {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

// ── Sub-components ────────────────────────────────────────────────

function StatCard({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="bg-[#111] border border-[#2A2A2A] rounded-xl p-5">
      <p className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</p>
      <p className="text-[#555] text-xs mt-1 uppercase tracking-wider">{label}</p>
    </div>
  )
}

function ProjectCard({
  project, done, total, lastJob,
}: {
  project: Project
  done: number
  total: number
  lastJob?: Job
}) {
  return (
    <Link href={`/dashboard/p/${project.id}`} className="group block">
      <div className="bg-[#111] border border-[#2A2A2A] rounded-xl p-5 h-full flex flex-col transition-all duration-200 hover:border-[#3A3A3A] hover:bg-[#131313] hover:shadow-[0_4px_32px_rgba(0,0,0,0.5)]">
        {/* Top row: color icon + arrow */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: `${project.color}18`,
              boxShadow: `0 0 20px ${project.color}25`,
            }}
          >
            <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: project.color }} />
          </div>
          <svg
            className="w-4 h-4 text-[#2A2A2A] group-hover:text-[#555] transition-colors mt-1 flex-shrink-0"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>

        {/* Project name */}
        <p className="text-white font-semibold truncate mb-5 text-sm">{project.name}</p>

        {/* Stats */}
        <div className="flex items-end gap-5 mt-auto">
          {total === 0 ? (
            <p className="text-[#333] text-xs">No files yet</p>
          ) : (
            <>
              <div>
                <p className="text-[#00FF94] text-2xl font-bold tabular-nums leading-none">{done}</p>
                <p className="text-[#444] text-[10px] uppercase tracking-wider mt-1">processed</p>
              </div>
              <div>
                <p className="text-[#555] text-xl font-bold tabular-nums leading-none">{total}</p>
                <p className="text-[#444] text-[10px] uppercase tracking-wider mt-1">total</p>
              </div>
            </>
          )}
        </div>

        {/* Last file name */}
        {lastJob && (
          <p className="text-[#333] text-xs mt-4 truncate">
            {lastJob.original_filename}
          </p>
        )}
      </div>
    </Link>
  )
}

function EmptyProjects() {
  return (
    <div className="border border-dashed border-[#222] rounded-2xl px-8 py-16 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
        style={{ backgroundColor: '#00FF9410', boxShadow: '0 0 30px #00FF9415' }}
      >
        <svg className="w-7 h-7 text-[#00FF94]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      </div>
      <p className="text-white font-semibold mb-2">Create your first project</p>
      <p className="text-[#555] text-sm leading-relaxed">
        Projects keep your audio files organized. Click{' '}
        <kbd className="bg-[#1A1A1A] border border-[#2A2A2A] rounded px-1.5 py-0.5 text-[#888] font-mono text-xs">+</kbd>{' '}
        next to <span className="text-[#666]">Projects</span> in the sidebar to get started.
      </p>
    </div>
  )
}

const STATUS_CONFIG = {
  pending:    { pill: 'bg-gray-500/20 text-gray-400 border-gray-500/30',   dot: 'bg-gray-400',    pulse: '',              label: 'Pending' },
  processing: { pill: 'bg-amber-400/20 text-amber-400 border-amber-400/30', dot: 'bg-amber-400',   pulse: 'animate-pulse', label: 'Processing' },
  done:       { pill: 'bg-[#00FF94]/20 text-[#00FF94] border-[#00FF94]/30', dot: 'bg-[#00FF94]',   pulse: '',              label: 'Done' },
  error:      { pill: 'bg-red-500/20 text-red-400 border-red-500/30',       dot: 'bg-red-400',     pulse: '',              label: 'Error' },
} as const

function StatusPill({ status }: { status: Job['status'] }) {
  const c = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${c.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot} ${c.pulse}`} />
      {c.label}
    </span>
  )
}

function RecentJobRow({ job, project }: { job: Job; project?: Project }) {
  return (
    <div className="flex items-center gap-4 bg-[#111] border border-[#2A2A2A] rounded-xl px-4 py-3.5 hover:border-[#2F2F2F] transition-colors">
      {/* Audio icon */}
      <div className="w-9 h-9 bg-[#1A1A1A] rounded-lg flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-[#444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{job.original_filename}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {project && (
            <>
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: project.color }}
              />
              <span className="text-[#555] text-xs truncate max-w-[140px]">{project.name}</span>
              <span className="text-[#2A2A2A] text-xs">·</span>
            </>
          )}
          <span className="text-[#444] text-xs">{formatBytes(job.file_size_bytes)}</span>
        </div>
      </div>

      <StatusPill status={job.status} />

      <p className="text-[#444] text-xs flex-shrink-0 tabular-nums w-14 text-right">
        {relativeTime(job.created_at)}
      </p>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: projectsRaw },
    { data: recentRaw },
    { data: statsRaw },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('jobs')
      .select('project_id, status')
      .eq('user_id', user.id),
  ])

  const projects = (projectsRaw as Project[]) ?? []
  const recentJobs = (recentRaw as Job[]) ?? []
  const allStats = (statsRaw as { project_id: string | null; status: string }[]) ?? []

  // Global counts (accurate — covers all jobs)
  const totalDone = allStats.filter(s => s.status === 'done').length
  const totalQueue = allStats.filter(s => s.status === 'pending' || s.status === 'processing').length

  // Avg processing time from recent batch
  const timed = recentJobs.filter(
    j => j.status === 'done' && j.processing_started_at && j.processing_finished_at
  )
  const avgTime = timed.length > 0
    ? Math.round(
        timed.reduce(
          (acc, j) =>
            acc +
            (new Date(j.processing_finished_at!).getTime() -
              new Date(j.processing_started_at!).getTime()) /
              1000,
          0
        ) / timed.length
      )
    : null

  // Per-project stats from allStats
  type ProjStat = { done: number; total: number; lastJob?: Job }
  const projectStats = new Map<string, ProjStat>()
  for (const s of allStats) {
    if (!s.project_id) continue
    const cur = projectStats.get(s.project_id) ?? { done: 0, total: 0 }
    cur.total++
    if (s.status === 'done') cur.done++
    projectStats.set(s.project_id, cur)
  }
  // Attach last recent job per project
  for (const job of recentJobs) {
    if (!job.project_id) continue
    const cur = projectStats.get(job.project_id)
    if (cur && !cur.lastJob) cur.lastJob = job
  }

  const projectById = new Map(projects.map(p => [p.id, p]))

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <main className="max-w-5xl mx-auto px-8 py-8 space-y-10">
      {/* Header */}
      <div>
        <p className="text-[#555] text-sm uppercase tracking-widest">{greeting}</p>
        <h1 className="text-white text-2xl font-bold mt-1">Overview</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard value={String(totalDone)} label="Files processed" color="#00FF94" />
        <StatCard value={String(totalQueue)} label="In queue" color="white" />
        <StatCard
          value={avgTime != null ? `${avgTime}s` : '--'}
          label="Avg processing time"
          color="#A0A0A0"
        />
      </div>

      {/* Projects */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-[#00FF94] rounded-full" />
            <h2 className="text-white font-semibold text-lg">Projects</h2>
          </div>
          {projects.length > 0 && (
            <span className="text-[#444] text-xs">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {projects.length === 0 ? (
          <EmptyProjects />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => {
              const s = projectStats.get(p.id) ?? { done: 0, total: 0 }
              return (
                <ProjectCard
                  key={p.id}
                  project={p}
                  done={s.done}
                  total={s.total}
                  lastJob={s.lastJob}
                />
              )
            })}
          </div>
        )}
      </section>

      {/* Recent Activity */}
      {recentJobs.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-5 bg-[#00FF94]/40 rounded-full" />
            <h2 className="text-white font-semibold text-lg">Recent Activity</h2>
          </div>
          <div className="space-y-2">
            {recentJobs.map(job => (
              <RecentJobRow
                key={job.id}
                job={job}
                project={job.project_id ? projectById.get(job.project_id) : undefined}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
