import { supabase } from './supabase'
import { Memory } from './types'

const BOOK_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

const SELECT_FIELDS = `
  id, title, body, happened_at,
  datum_label, datum_jahr, datum_monat, datum_tag,
  location, card_size, card_color, groesse_manuell, foto_url, icon, kategorie, body_extra
`

function mapRow(r: Record<string, unknown>): Memory {
  return {
    id:             r.id as string,
    title:          (r.title as string)       ?? undefined,
    body:           (r.body as string)        ?? undefined,
    happenedAt:     (r.happened_at as string) ?? undefined,
    datumLabel:     (r.datum_label as string) ?? undefined,
    datumJahr:      r.datum_jahr as number,
    datumMonat:     (r.datum_monat as number) ?? undefined,
    datumTag:       (r.datum_tag as number)   ?? undefined,
    location:       (r.location as string)    ?? undefined,
    cardSize:       (r.card_size  as Memory['cardSize'])  ?? 'medium',
    cardColor:      (r.card_color as Memory['cardColor']) ?? undefined,
    pinnedSize:     r.card_size ? (r.card_size as Memory['cardSize']) : undefined,
    groesseManuell: (r.groesse_manuell as boolean) ?? false,
    imageUrl:       (r.foto_url as string)    ?? undefined,
    icon:           (r.icon as string)        ?? undefined,
    kategorie:      (r.kategorie as string)   ?? undefined,
    bodyExtra:      (r.body_extra as string)  ?? undefined,
  }
}

export async function fetchMemoryById(id: string): Promise<Memory | null> {
  const { data, error } = await supabase
    .from('memories')
    .select(SELECT_FIELDS)
    .eq('id', id)
    .single()
  if (error || !data) return null
  return mapRow(data)
}

export async function fetchAdjacentMemories(
  id: string,
): Promise<{ prev: Memory | null; next: Memory | null }> {
  const { data } = await supabase
    .from('memories')
    .select('id, title, datum_jahr, datum_monat, datum_tag, card_size, card_color, groesse_manuell, foto_url, icon, kategorie, datum_label, body_extra')
    .eq('book_id', BOOK_ID)
    .order('datum_jahr',  { ascending: true })
    .order('datum_monat', { ascending: true, nullsFirst: true })
    .order('datum_tag',   { ascending: true, nullsFirst: true })

  if (!data) return { prev: null, next: null }
  const idx = data.findIndex((r) => r.id === id)
  return {
    prev: idx > 0            ? mapRow(data[idx - 1]) : null,
    next: idx < data.length - 1 ? mapRow(data[idx + 1]) : null,
  }
}

export async function fetchMemories(): Promise<Memory[]> {
  const { data, error } = await supabase
    .from('memories')
    .select(`
      id, title, body, happened_at,
      datum_label, datum_jahr, datum_monat, datum_tag,
      location, card_size, card_color, groesse_manuell, foto_url, icon, kategorie
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
    cardSize:   (r.card_size  as Memory['cardSize'])  ?? 'medium',
    cardColor:  (r.card_color as Memory['cardColor']) ?? undefined,
    pinnedSize:     r.card_size ? (r.card_size as Memory['cardSize']) : undefined,
    groesseManuell: r.groesse_manuell ?? false,
    imageUrl:       r.foto_url ?? undefined,
    icon: r.icon ?? undefined,
    kategorie: r.kategorie ?? undefined,
  }))
}

