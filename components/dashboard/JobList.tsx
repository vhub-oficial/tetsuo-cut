'use client'

import { useEffect, useState } from 'react'
import type { Job } from '@/lib/types'
import JobCard from './JobCard'

interface JobListProps {
  initialJobs: Job[]
  onRegisterAdd?: (fn: (job: Job) => void) => void
}

export default function JobList({ initialJobs, onRegisterAdd }: JobListProps) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)

  useEffect(() => {
    onRegisterAdd?.((job: Job) => {
      setJobs((prev) => [job, ...prev])
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const doneJobs = jobs.filter((j) => j.status === 'done')

  async function handleDownloadAll() {
    for (const job of doneJobs) {
      const res = await fetch(`/api/download/${job.id}`)
      const { url } = await res.json()
      if (!url) continue
      const a = document.createElement('a')
      a.href = url
      a.download = job.original_filename.replace(/\.(mp3|wav)$/i, '_cut.$1')
      a.click()
      await new Promise<void>((resolve) => setTimeout(resolve, 500))
    }
  }

  return (
    <section>
      {/* History header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-1 h-5 bg-[#00FF94]/40 rounded-full" />
          <h2 className="text-white font-semibold text-lg">
            History
            {jobs.length > 0 && (
              <span className="ml-2 text-sm font-normal text-[#555]">
                {jobs.length} job{jobs.length !== 1 ? 's' : ''}
              </span>
            )}
          </h2>
        </div>
        {doneJobs.length >= 2 && (
          <button
            onClick={handleDownloadAll}
            className="text-white text-sm border border-[#2A2A2A] hover:border-[#3A3A3A] rounded-lg px-3 py-1.5 transition-colors"
          >
            Download All ({doneJobs.length})
          </button>
        )}
      </div>

      {/* Empty state */}
      {jobs.length === 0 ? (
        <div className="text-center py-16">
          <svg
            width="48"
            height="32"
            viewBox="0 0 48 32"
            fill="none"
            className="mx-auto mb-4"
          >
            <path
              d="M0 16 H4 V10 H8 V22 H12 V6 H16 V26 H20 V12 H24 V20 H28 V8 H32 V24 H36 V14 H40 V18 H44 V16 H48"
              stroke="#2A2A2A"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-[#555] text-sm font-medium mb-1">No audio processed yet</p>
          <p className="text-[#3A3A3A] text-xs">
            Drop MP3 or WAV files above — pauses and breaths are removed automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <JobCard key={job.id} initialJob={job} />
          ))}
        </div>
      )}
    </section>
  )
}
