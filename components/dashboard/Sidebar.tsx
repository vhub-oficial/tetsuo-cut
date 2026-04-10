'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Project } from '@/lib/types'
import StorageBar from './StorageBar'

const PROJECT_COLORS = ['#00FF94', '#4D9EFF', '#FF6B6B', '#FFB800', '#B16CFB', '#FF8C00']

// ── Sub-components ──────────────────────────────────────────────

function SidebarLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
        isActive
          ? 'bg-[#1A1A1A] text-white'
          : 'text-[#555] hover:text-white hover:bg-[#141414]'
      }`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      {label}
    </Link>
  )
}

function SidebarProjectItem({ project, onDelete }: { project: Project; onDelete: (id: string) => void }) {
  const pathname = usePathname()
  const href = `/dashboard/p/${project.id}`
  const isActive = pathname === href

  return (
    <Link
      href={href}
      className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
        isActive
          ? 'bg-[#1A1A1A] text-white'
          : 'text-[#555] hover:text-white hover:bg-[#141414]'
      }`}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: project.color }}
      />
      <span className="truncate flex-1">{project.name}</span>
      <span
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onDelete(project.id)
        }}
        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-[10px] leading-none cursor-pointer transition-opacity text-[#555] hover:text-red-400"
      >
        ✕
      </span>
    </Link>
  )
}

function ProjectCreateForm({ onCreated, onCancel }: { onCreated: (p: Project) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(PROJECT_COLORS[0])
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!name.trim()) return
    setLoading(true)
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), color }),
    })
    const { project } = await res.json()
    if (project) onCreated(project)
    setLoading(false)
  }

  return (
    <div className="px-2 py-2 space-y-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="Project name"
        className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#555] focus:border-[#00FF94] focus:outline-none"
      />
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {PROJECT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-3 h-3 rounded-full transition-transform ${
                color === c ? 'scale-125 ring-2 ring-white/30' : ''
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !name.trim()}
          className="ml-auto text-[10px] bg-[#00FF94] text-black font-bold px-2 py-0.5 rounded disabled:opacity-40"
        >
          Create
        </button>
      </div>
    </div>
  )
}

// ── Main Sidebar ────────────────────────────────────────────────

interface SidebarProps {
  user: { id: string; name: string }
  projects: Project[]
  storageUsed: number
  storageLimit: number
  logout: () => Promise<void>
}

export default function Sidebar({
  user,
  projects: initialProjects,
  storageUsed,
  storageLimit,
  logout,
}: SidebarProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [creating, setCreating] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  function handleProjectCreated(project: Project) {
    setProjects((prev) => [project, ...prev])
    setCreating(false)
    router.push(`/dashboard/p/${project.id}`)
  }

  async function handleDelete(id: string) {
    await fetch(`/api/projects?id=${id}`, { method: 'DELETE' })
    setProjects((prev) => prev.filter((p) => p.id !== id))
    if (pathname === `/dashboard/p/${id}`) {
      router.push('/dashboard')
    }
  }

  return (
    <aside className="w-60 min-h-screen bg-[#0D0D0D] border-r border-[#1A1A1A] flex flex-col flex-shrink-0">
      {/* Top — Logo + user */}
      <div className="p-5 border-b border-[#1A1A1A]">
        <p className="text-[#00FF94] font-black tracking-[0.12em] text-sm uppercase text-glow-neon">
          TETSUO CUT
        </p>
        <p className="text-[#444] text-[9px] tracking-widest uppercase mt-0.5">
          silence removed. precision kept.
        </p>
        <p className="text-[#555] text-xs mt-3 truncate">{user.name}</p>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1">
        <SidebarLink href="/dashboard" label="All Files" />
      </nav>

      {/* Projects section */}
      <div className="px-3">
        <div className="flex items-center justify-between py-2 px-2">
          <span className="text-[#444] text-[10px] uppercase tracking-widest font-medium">
            Projects
          </span>
          <button
            onClick={() => setCreating(true)}
            className="text-[#444] hover:text-[#00FF94] transition-colors text-lg leading-none"
          >
            +
          </button>
        </div>

        {creating && (
          <ProjectCreateForm
            onCreated={handleProjectCreated}
            onCancel={() => setCreating(false)}
          />
        )}

        <div className="space-y-0.5">
          {projects.map((p) => (
            <SidebarProjectItem key={p.id} project={p} onDelete={handleDelete} />
          ))}
        </div>
      </div>

      {/* Bottom — Storage + Sign out */}
      <div className="mt-auto p-4 border-t border-[#1A1A1A] space-y-4">
        <StorageBar used={storageUsed} limit={storageLimit} />
        <form action={logout}>
          <button
            type="submit"
            className="w-full text-left text-xs text-[#444] hover:text-white transition-colors px-2 py-1"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
