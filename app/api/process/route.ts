import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  // Verify the caller is authenticated
  const authClient = await createClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let job_id: string
  try {
    const body = await req.json()
    job_id = body.job_id
    if (!job_id) throw new Error('missing job_id')
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Use service role to bypass RLS and verify job ownership
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, user_id, status')
    .eq('id', job_id)
    .single()

  if (jobError || !job) {
    return Response.json({ error: 'Job not found' }, { status: 404 })
  }

  if (job.user_id !== user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (job.status !== 'pending') {
    return Response.json({ error: 'Job is not in pending state' }, { status: 409 })
  }

  const modalUrl = process.env.MODAL_ENDPOINT_URL
  if (!modalUrl) {
    return Response.json({ error: 'Modal endpoint not configured' }, { status: 503 })
  }

  // Fire and forget — do not await
  fetch(modalUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id }),
  }).catch((err) => {
    console.error('[process] Modal call failed:', err)
  })

  return Response.json({ ok: true })
}
