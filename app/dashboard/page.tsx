import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase-server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  // Load projects
  const { data: projects } = await supabase
    .from('projects')
    .select('id, titel, typ, cover_url, zuletzt_bearbeitet, vorname, nachname, firmenname, geburtsdatum_text, geburtsort, sterbedatum_text, sterbeort')
    .eq('user_id', user.id)
    .order('zuletzt_bearbeitet', { ascending: false })

  // Load profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('vorname, nachname')
    .eq('id', user.id)
    .single()

  return <DashboardClient user={user} projects={projects ?? []} profile={profile} />
}
