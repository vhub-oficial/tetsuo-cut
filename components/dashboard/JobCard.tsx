'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Job, JobStatus } from '@/lib/types'

const STUCK_AFTER_SECS = 60

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatProcessingTime(start: string, end: string): string {
  const s = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000)
  return `Processed in ${s}s`
}

function formatElapsed(s: number): string {
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function StatusBadge({ status }: { status: JobStatus }) {
  const styles: Record<JobStatus, string> = {
    pending: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    processing: 'bg-amber-400/20 text-amber-400 border-amber-400/30',
    done: 'bg-[#00FF94]/20 text-[#00FF94] border-[#00FF94]/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
  }

  const labels: Record<JobStatus, string> = {
    pending: 'Pending',
    processing: 'Processing',
    done: 'Done',
    error: 'Error',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status]}`}
    >
      {status === 'processing' && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      )}
      {status === 'pending' && (
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
      )}
      {status === 'done' && (
        <span className="w-1.5 h-1.5 rounded-full bg-[#00FF94]" />
      )}
      {status === 'error' && (
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
      )}
      {labels[status]}
    </span>
  )
}

interface JobCardProps {
  initialJob: Job
  onDelete: (id: string) => void
}

export default function JobCard({ initialJob, onDelete }: JobCardProps) {
  const [job, setJob] = useState<Job>(initialJob)
  const [downloading, setDownloading] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState<string | null>(null)
  const [elapsedSecs, setElapsedSecs] = useState(0)

  // Poll for status updates while job is active
  useEffect(() => {
    if (job.status === 'done' || job.status === 'error') return

    const supabase = createClient()
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', job.id)
        .single()

      if (data) setJob(data as Job)
    }, 3000)

    return () => clearInterval(interval)
  }, [job.status, job.id])

  // Elapsed-time counter for pending/processing jobs
  useEffect(() => {
    if (job.status !== 'pending' && job.status !== 'processing') {
      setElapsedSecs(0)
      return
    }
    const since =
      job.status === 'processing' && job.processing_started_at
        ? new Date(job.processing_started_at).getTime()
        : new Date(job.created_at).getTime()

    const tick = () => setElapsedSecs(Math.floor((Date.now() - since) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [job.status, job.created_at, job.processing_started_at])

  const isStuck =
    elapsedSecs >= STUCK_AFTER_SECS &&
    (job.status === 'pending' || job.status === 'processing')

  async function handleDelete() {
    if (!window.confirm('Delete this job and its files?')) return
    await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' })
    onDelete(job.id)
  }

  async function handleRetry() {
    setRetrying(true)
    setRetryError(null)
    setElapsedSecs(0) // reset counter so stuck warning clears immediately
    try {
      const res = await fetch(`/api/reprocess/${job.id}`)
      const { error } = await res.json()
      if (error) throw new Error(error)
      setJob((prev) => ({ ...prev, status: 'pending' }))
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : 'Retry failed')
    } finally {
      setRetrying(false)
    }
  }

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/download/${job.id}`)
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      const a = document.createElement('a')
      a.href = url
      a.download = job.original_filename.replace(/\.(mp3|wav)$/i, '_cut.$1')
      a.click()
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setDownloading(false)
    }
  }

  const isActive = job.status === 'processing'

  return (
    <div
      className={`group bg-[#1A1A1A] border rounded-xl p-5 transition-all duration-200 hover:border-[#333333] hover:shadow-[0_4px_24px_rgba(0,0,0,0.4)] ${
        isActive
          ? 'border-amber-400/30 shadow-[0_0_16px_rgba(251,191,36,0.1)]'
          : job.status === 'done'
          ? 'border-[#00FF94]/20 shadow-[0_0_16px_rgba(0,255,148,0.08)]'
          : job.status === 'error'
          ? 'border-red-500/20'
          : 'border-[#2A2A2A]'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p
            className="text-white text-sm font-medium truncate"
            title={job.original_filename}
          >
            {job.original_filename}
          </p>
          <p className="text-[#A0A0A0] text-xs mt-1">
            {formatBytes(job.file_size_bytes)}
            {job.file_duration_seconds != null &&
              ` · ${formatDuration(job.file_duration_seconds)}`}
          </p>
        </div>
        <StatusBadge status={job.status} />
      </div>

      {/* Processing sweep bar */}
      {job.status === 'processing' && (
        <div className="mb-4 h-1 bg-[#2A2A2A] rounded-full overflow-hidden">
          <div className="h-full w-full relative">
            <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-shimmer" />
          </div>
        </div>
      )}

      {/* Stuck warning */}
      {isStuck && (
        <div className="flex items-center justify-between bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2 mb-4">
          <span className="text-amber-400 text-xs">
            Taking longer than expected · {formatElapsed(elapsedSecs)}
          </span>
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="text-amber-400 hover:text-amber-300 text-xs font-medium ml-3 disabled:opacity-50 transition-colors"
          >
            {retrying ? 'Retrying…' : 'Retry now'}
          </button>
        </div>
      )}

      {/* Error message */}
      {job.status === 'error' && (
        <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">
          {job.error_message || 'Processing failed. Try again.'}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-end justify-between">
        <div className="flex items-start gap-2">
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 transition-all text-[#555] hover:text-red-400 hover:drop-shadow-[0_0_6px_rgba(248,113,113,0.8)] mt-0.5"
            title="Delete job"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <div>
            <p className="text-[#666] text-xs">
              {new Date(job.created_at).toLocaleString()}
            </p>
            {job.status === 'done' && job.processing_started_at && job.processing_finished_at && (
              <p className="text-[#666] text-xs mt-0.5">
                {formatProcessingTime(job.processing_started_at, job.processing_finished_at)}
              </p>
            )}
            {(job.status === 'pending' || job.status === 'processing') && !isStuck && (
              <p className="text-[#444] text-xs mt-0.5 tabular-nums">
                {job.status === 'processing' ? 'Processing' : 'Waiting'} · {formatElapsed(elapsedSecs)}
              </p>
            )}
          </div>
        </div>

        {job.status === 'done' && (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 bg-[#00FF94] text-black text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#00e085] transition-colors disabled:opacity-50 disabled:cursor-not-allowed glow-neon-sm"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            {downloading ? 'Preparing…' : 'Download'}
          </button>
        )}

        {job.status === 'error' && (
          <div className="flex flex-col items-end gap-1.5">
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="flex items-center gap-2 bg-[#2A2A2A] border border-[#3A3A3A] text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-[#333] hover:border-[#484848] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {retrying ? 'Retrying…' : 'Retry'}
            </button>
            {retryError && (
              <p className="text-red-400 text-xs">{retryError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
