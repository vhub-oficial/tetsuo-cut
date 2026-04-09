export type JobStatus = 'pending' | 'processing' | 'done' | 'error'

export interface Job {
  id: string
  user_id: string
  original_filename: string
  original_file_path: string
  file_size_bytes: number
  file_duration_seconds: number | null
  status: JobStatus
  processed_file_path: string | null
  error_message: string | null
  settings: Record<string, unknown>
  modal_call_id: string | null
  processing_started_at: string | null
  processing_finished_at: string | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: string
  created_at: string
  updated_at: string
}

export interface JobLog {
  id: string
  job_id: string
  level: string
  message: string
  metadata: Record<string, unknown> | null
  created_at: string
}
