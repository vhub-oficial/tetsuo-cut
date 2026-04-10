import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: Request,
  { params }: { params: { jobId: string } }
) {
  // Verify the caller is authenticated
  const authClient = await createClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { jobId } = params

  // Use service role to bypass RLS and verify job ownership
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, user_id')
    .eq('id', jobId)
    .single()

  if (jobError || !job) {
    return Response.json({ error: 'Job not found' }, { status: 404 })
  }

  if (job.user_id !== user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Reset job to pending regardless of current status
  const { error: resetError } = await supabase
    .from('jobs')
    .update({
      status: 'pending',
      error_message: null,
      processing_started_at: null,
      processing_finished_at: null,
    })
    .eq('id', jobId)

  if (resetError) {
    console.error('[reprocess] Failed to reset job:', resetError)
    return Response.json({ error: 'Failed to reset job' }, { status: 500 })
  }

  const modalUrl = process.env.MODAL_ENDPOINT_URL
  if (!modalUrl) {
    return Response.json({ error: 'Modal endpoint not configured' }, { status: 503 })
  }

  // Fire and forget — do not await
  fetch(modalUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: jobId }),
  }).catch((err) => {
    console.error('[reprocess] Modal call failed:', err)
  })

  return Response.json({ ok: true })
}
