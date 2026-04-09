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

  // Use service role to access storage
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify job belongs to user and is done
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, user_id, status, processed_file_path')
    .eq('id', jobId)
    .single()

  if (jobError || !job) {
    return Response.json({ error: 'Job not found' }, { status: 404 })
  }

  if (job.user_id !== user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (job.status !== 'done' || !job.processed_file_path) {
    return Response.json({ error: 'Processed file not available' }, { status: 409 })
  }

  // Generate signed URL valid for 60 seconds
  const { data: signedData, error: signedError } = await supabase.storage
    .from('audio-processed')
    .createSignedUrl(job.processed_file_path, 60)

  if (signedError || !signedData?.signedUrl) {
    return Response.json({ error: 'Failed to generate download URL' }, { status: 500 })
  }

  return Response.json({ url: signedData.signedUrl })
}
