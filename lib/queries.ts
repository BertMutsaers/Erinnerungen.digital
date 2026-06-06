import { supabase } from './supabase'
import { Memory } from './types'

const BOOK_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

export async function fetchMemories(): Promise<Memory[]> {
  const { data, error } = await supabase
    .from('memories')
    .select(`
      id, title, body, happened_at,
      datum_label, datum_jahr, datum_monat, datum_tag,
      location, icon, kategorie
    `)
    .eq('book_id', BOOK_ID)
    .order('datum_jahr', { ascending: true })
    .order('datum_monat', { ascending: true, nullsFirst: true })
    .order('datum_tag', { ascending: true, nullsFirst: true })

  if (error) throw new Error(error.message)

  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title ?? undefined,
    body: r.body ?? undefined,
    happenedAt: r.happened_at ?? undefined,
    datumLabel: r.datum_label ?? undefined,
    datumJahr: r.datum_jahr,
    datumMonat: r.datum_monat ?? undefined,
    datumTag: r.datum_tag ?? undefined,
    location: r.location ?? undefined,
    cardSize:  'medium', // overridden by planGridLayout in groupByPhase
    cardColor: 'weiss',  // overridden by planGridLayout in groupByPhase
    icon: r.icon ?? undefined,
    kategorie: r.kategorie ?? undefined,
  }))
}

