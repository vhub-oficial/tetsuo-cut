import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// PATCH /api/jobs/[jobId] — move job para um projeto { project_id: string | null }
export async function PATCH(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { project_id } = await req.json()

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify ownership
  const { data: job } = await supabase
    .from('jobs').select('user_id').eq('id', params.jobId).single()
  if (!job || job.user_id !== user.id)
    return Response.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabase
    .from('jobs')
    .update({ project_id: project_id ?? null })
    .eq('id', params.jobId)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

// DELETE /api/jobs/[jobId] — apaga job + arquivos do storage
export async function DELETE(
  _req: Request,
  { params }: { params: { jobId: string } }
) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: job } = await supabase
    .from('jobs')
    .select('user_id, original_file_path, processed_file_path, status')
    .eq('id', params.jobId)
    .single()

  if (!job || job.user_id !== user.id)
    return Response.json({ error: 'Not found' }, { status: 404 })

  // Delete from storage (best effort — don't fail if file missing)
  if (job.original_file_path) {
    await supabase.storage.from('audio-originals').remove([job.original_file_path])
  }
  if (job.processed_file_path) {
    await supabase.storage.from('audio-processed').remove([job.processed_file_path])
  }

  // Delete job record (trigger will update storage_used_bytes in profiles)
  const { error } = await supabase.from('jobs').delete().eq('id', params.jobId)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}
