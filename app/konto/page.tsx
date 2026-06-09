import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase-server'
import KontoClient from './KontoClient'

export default async function KontoPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('vorname, nachname')
    .eq('id', user.id)
    .single()

  return <KontoClient user={user} profile={profile} />
}
