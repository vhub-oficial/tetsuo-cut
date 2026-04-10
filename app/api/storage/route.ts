import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('storage_used_bytes, storage_limit_bytes')
    .eq('id', user.id)
    .single()

  return Response.json({
    used: profile?.storage_used_bytes ?? 0,
    limit: profile?.storage_limit_bytes ?? 524288000,
  })
}
