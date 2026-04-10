'use client'

import { useCallback, useRef } from 'react'
import type { Job } from '@/lib/types'
import DropZone from './DropZone'
import JobList from './JobList'
import StorageBar from './StorageBar'

interface DashboardClientProps {
  userId: string
  initialJobs: Job[]
  storageUsed: number
  storageLimit: number
}

export default function DashboardClient({ userId, initialJobs, storageUsed, storageLimit }: DashboardClientProps) {
  const addJobRef = useRef<((job: Job) => void) | null>(null)

  const onRegisterAdd = useCallback((fn: (job: Job) => void) => {
    addJobRef.current = fn
  }, [])

  const onJobCreated = useCallback((job: Job) => {
    addJobRef.current?.(job)
  }, [])

  return (
    <div className="space-y-10">
      {/* New Job section */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-5 bg-[#00FF94] rounded-full" />
          <h2 className="text-white font-semibold text-lg">New Job</h2>
        </div>
        <DropZone userId={userId} onJobCreated={onJobCreated} />
      </section>

      <StorageBar used={storageUsed} limit={storageLimit} />

      {/* History section — JobList renders its own header */}
      <JobList initialJobs={initialJobs} onRegisterAdd={onRegisterAdd} />
    </div>
  )
}
