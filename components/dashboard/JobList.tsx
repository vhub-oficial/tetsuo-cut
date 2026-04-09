'use client'

import { useState } from 'react'
import type { Job } from '@/lib/types'
import JobCard from './JobCard'

interface JobListProps {
  initialJobs: Job[]
}

export default function JobList({ initialJobs }: JobListProps) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)

  // Expose setter so DropZone can push new jobs
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__addJob = (job: Job) => {
      setJobs((prev) => [job, ...prev])
    }
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-16 text-[#555]">
        <p className="text-sm">No jobs yet. Drop some audio files above to get started.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {jobs.map((job) => (
        <JobCard key={job.id} initialJob={job} />
      ))}
    </div>
  )
}

export function addJobToList(job: Job) {
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fn = (window as any).__addJob
    if (fn) fn(job)
  }
}
