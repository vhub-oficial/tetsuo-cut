import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Project } from '@/lib/types'
import Sidebar from '@/components/dashboard/Sidebar'

async function logout() {
  'use server'
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, storage_used_bytes, storage_limit_bytes')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar
        user={{ id: user.id, name: profile?.full_name ?? user.email ?? '' }}
        projects={(projects as Project[]) ?? []}
        storageUsed={profile?.storage_used_bytes ?? 0}
        storageLimit={profile?.storage_limit_bytes ?? 524288000}
        logout={logout}
      />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
