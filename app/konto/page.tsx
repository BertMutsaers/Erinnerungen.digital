import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase-server'
import KontoClient from './KontoClient'

export default async function KontoPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  // Ensure a profile row exists — handles users registered before the auto-create trigger.
  // upsert with no data fields: creates the row if absent, no-ops if present.
  await supabase
    .from('profiles')
    .upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true })

  const { data: profile } = await supabase
    .from('profiles')
    .select('vorname, nachname, anzeigename, avatar_url')
    .eq('id', user.id)
    .single()

  return <KontoClient user={user} profile={profile} />
}
