'use client'
import { useEffect, useState } from 'react'
import type { Project } from '@/lib/types'

const PROJECT_COLORS = ['#00FF94','#4D9EFF','#FF6B6B','#FFB800','#B16CFB','#FF8C00']

interface ProjectSelectorProps {
  value: string | null           // project_id selecionado
  onChange: (id: string | null) => void
  compact?: boolean              // versão menor para uso no JobCard
}

export default function ProjectSelector({ value, onChange, compact }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PROJECT_COLORS[0])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(d => setProjects(d.projects ?? []))
  }, [])

  async function handleCreate() {
    if (!newName.trim()) return
    setLoading(true)
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    })
    const { project } = await res.json()
    if (project) {
      setProjects(prev => [project, ...prev])
      onChange(project.id)
      setCreating(false)
      setNewName('')
    }
    setLoading(false)
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await fetch(`/api/projects?id=${id}`, { method: 'DELETE' })
    setProjects(prev => prev.filter(p => p.id !== id))
    if (value === id) onChange(null)
  }

  if (compact) {
    // versão compacta: só um <select> simples
    return (
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
        className="text-xs bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-2 py-1 text-[#A0A0A0] focus:border-[#00FF94] focus:outline-none"
      >
        <option value="">No project</option>
        {projects.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    )
  }

  return (
    <div className="space-y-2">
      {/* Project chips */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
            value === null
              ? 'border-[#00FF94] text-[#00FF94] bg-[#00FF94]/10'
              : 'border-[#2A2A2A] text-[#555] hover:border-[#3A3A3A]'
          }`}
        >
          No project
        </button>
        {projects.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={`group text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${
              value === p.id
                ? 'border-current bg-current/10'
                : 'border-[#2A2A2A] text-[#A0A0A0] hover:border-[#3A3A3A]'
            }`}
            style={value === p.id ? { color: p.color, borderColor: p.color } : {}}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: p.color }}
            />
            {p.name}
            <span
              onClick={e => handleDelete(p.id, e)}
              className="ml-0.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 text-[10px] leading-none cursor-pointer transition-opacity"
            >
              ✕
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="text-xs px-3 py-1.5 rounded-full border border-dashed border-[#2A2A2A] text-[#555] hover:border-[#3A3A3A] hover:text-[#A0A0A0] transition-all"
        >
          + New project
        </button>
      </div>

      {/* Inline creation form */}
      {creating && (
        <div className="flex items-center gap-2 p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
            placeholder="Project name"
            className="flex-1 bg-transparent text-sm text-white placeholder-[#555] focus:outline-none"
          />
          <div className="flex gap-1">
            {PROJECT_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={`w-4 h-4 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-white/30' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={loading || !newName.trim()}
            className="text-xs bg-[#00FF94] text-black font-bold px-3 py-1 rounded-lg disabled:opacity-40"
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => setCreating(false)}
            className="text-xs text-[#555] hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
