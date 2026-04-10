'use client'

import { useCallback, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Job } from '@/lib/types'

const ACCEPTED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/wave', 'audio/x-wav']
const ACCEPTED_EXT = ['.mp3', '.wav']
const MAX_SIZE_BYTES = 100 * 1024 * 1024 // 100 MB

interface UploadItem {
  file: File
  id: string
  status: 'uploading' | 'queued' | 'error'
  progress: number // 0–100
  error?: string
}

function isAudioFile(file: File): boolean {
  const typeOk = ACCEPTED_TYPES.includes(file.type)
  const extOk = ACCEPTED_EXT.some((e) => file.name.toLowerCase().endsWith(e))
  return typeOk || extOk
}

export default function DropZone({
  userId,
  onJobCreated,
}: {
  userId: string
  onJobCreated: (job: Job) => void
}) {
  const [dragging, setDragging] = useState(false)
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(
    async (files: File[]) => {
      const valid = files.filter((f) => {
        if (!isAudioFile(f)) return false
        if (f.size > MAX_SIZE_BYTES) return false
        return true
      })

      if (valid.length === 0) return

      const supabase = createClient()

      for (const file of valid) {
        const itemId = crypto.randomUUID()
        setUploads((prev) => [
          { file, id: itemId, status: 'uploading', progress: 0 },
          ...prev,
        ])

        // Fake progress: increments ~1.5 per 100ms, caps at 80
        const progressInterval = setInterval(() => {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === itemId && u.status === 'uploading'
                ? { ...u, progress: Math.min(u.progress + 1.5, 80) }
                : u
            )
          )
        }, 100)

        try {
          const ext = file.name.split('.').pop()!.toLowerCase()
          const storagePath = `${userId}/${crypto.randomUUID()}.${ext}`

          // Upload to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('audio-originals')
            .upload(storagePath, file, { upsert: false })

          if (uploadError) throw new Error(uploadError.message)

          // Insert job record
          const { data: job, error: insertError } = await supabase
            .from('jobs')
            .insert({
              user_id: userId,
              original_filename: file.name,
              original_file_path: storagePath,
              file_size_bytes: file.size,
              status: 'pending',
              settings: {},
            })
            .select()
            .single()

          if (insertError || !job) throw new Error(insertError?.message ?? 'Failed to create job')

          // Trigger processing — await so the loop stays sequential
          await fetch('/api/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ job_id: job.id }),
          }).catch(() => {})

          // Jump to 100% and notify parent
          clearInterval(progressInterval)
          setUploads((prev) =>
            prev.map((u) => (u.id === itemId ? { ...u, progress: 100 } : u))
          )
          onJobCreated(job as Job)

          // Remove upload card after a brief moment
          setTimeout(() => {
            setUploads((prev) => prev.filter((u) => u.id !== itemId))
          }, 400)
        } catch (err) {
          clearInterval(progressInterval)
          const message = err instanceof Error ? err.message : 'Upload failed'
          setUploads((prev) =>
            prev.map((u) =>
              u.id === itemId ? { ...u, status: 'error', progress: 0, error: message } : u
            )
          )
          // Auto-clear error after 5s
          setTimeout(() => {
            setUploads((prev) => prev.filter((u) => u.id !== itemId))
          }, 5000)
        }
      }
    },
    [userId, onJobCreated]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const files = Array.from(e.dataTransfer.files)
      processFiles(files)
    },
    [processFiles]
  )

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  const onDragLeave = () => setDragging(false)

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    processFiles(files)
    e.target.value = ''
  }

  return (
    <div className="space-y-3">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 ${
          dragging
            ? 'border-[#00FF94] bg-[#00FF94]/5 shadow-[0_0_30px_rgba(0,255,148,0.15)]'
            : 'border-[#2A2A2A] bg-[#111111] hover:border-[#3A3A3A] hover:bg-[#141414]'
        }`}
        style={{ minHeight: 200 }}
      >
        <div className="flex flex-col items-center justify-center py-14 px-6 text-center pointer-events-none select-none">
          {/* Icon */}
          <div
            className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 transition-colors ${
              dragging ? 'bg-[#00FF94]/20' : 'bg-[#1A1A1A]'
            }`}
          >
            <svg
              className={`w-7 h-7 transition-colors ${dragging ? 'text-[#00FF94]' : 'text-[#555]'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
          </div>

          <p
            className={`text-base font-semibold mb-1 transition-colors ${
              dragging ? 'text-[#00FF94]' : 'text-white'
            }`}
          >
            {dragging ? 'Drop to process' : 'Drop audio files here'}
          </p>
          <p className="text-[#A0A0A0] text-sm mb-4">
            or{' '}
            <span className="text-[#00FF94] underline underline-offset-2">
              browse files
            </span>
          </p>
          <p className="text-[#555] text-xs">
            MP3 and WAV up to 100 MB · Multiple files supported
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.wav,audio/mpeg,audio/wav"
          multiple
          onChange={onInputChange}
          className="hidden"
        />
      </div>

      {/* Active uploads */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((u) => (
            <div
              key={u.id}
              className={`relative flex items-center gap-3 bg-[#1A1A1A] border rounded-lg px-4 py-3 text-sm overflow-hidden ${
                u.status === 'error'
                  ? 'border-red-500/30'
                  : 'border-[#2A2A2A]'
              }`}
            >
              {u.status === 'uploading' && (
                <div className="w-4 h-4 border-2 border-[#00FF94]/30 border-t-[#00FF94] rounded-full animate-spin flex-shrink-0" />
              )}
              {u.status === 'error' && (
                <span className="text-red-400 flex-shrink-0">✕</span>
              )}
              <span className="truncate text-[#A0A0A0]">{u.file.name}</span>
              {u.status === 'uploading' && (
                <span className="ml-auto text-xs text-[#555] flex-shrink-0 tabular-nums">
                  {Math.round(u.progress)}%
                </span>
              )}
              {u.status === 'error' && u.error && (
                <span className="ml-auto text-xs text-red-400 flex-shrink-0">
                  {u.error}
                </span>
              )}
              {/* Progress bar */}
              {u.status === 'uploading' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2A2A2A] overflow-hidden">
                  <div
                    className="h-full bg-[#00FF94] transition-all duration-300"
                    style={{ width: `${u.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
