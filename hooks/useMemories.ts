'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Memory } from '@/lib/types'
import { groupByPhase, Phase } from '@/lib/phases'

interface UseMemoriesResult {
  memories: Memory[]
  phases: Phase[]
  loading: boolean
  error: string | null
  reload: () => void
}

export function useMemories(bookId: string, filter = 'alle'): UseMemoriesResult {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [tick, setTick]         = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    supabase
      .from('memories')
      .select(`
        id, title, body, happened_at,
        datum_label, datum_jahr, datum_monat, datum_tag,
        location, card_size, card_color, groesse_manuell, foto_url, icon, kategorie, body_extra
      `)
      .eq('book_id', bookId)
      .order('datum_jahr',  { ascending: true })
      .order('datum_monat', { ascending: true, nullsFirst: true })
      .order('datum_tag',   { ascending: true, nullsFirst: true })
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) { setError(err.message); setLoading(false); return }
        const mapped: Memory[] = (data ?? []).map((r) => ({
          id:         r.id,
          title:      r.title      ?? undefined,
          body:       r.body       ?? undefined,
          happenedAt: r.happened_at ?? undefined,
          datumLabel: r.datum_label ?? undefined,
          datumJahr:  r.datum_jahr,
          datumMonat: r.datum_monat ?? undefined,
          datumTag:   r.datum_tag   ?? undefined,
          location:   r.location   ?? undefined,
          cardSize:   (r.card_size  as import('@/lib/types').CardSize)  ?? 'medium',
          cardColor:  (r.card_color as import('@/lib/types').CardColor) ?? undefined,
          pinnedSize:     r.card_size ? (r.card_size as import('@/lib/types').CardSize) : undefined,
          groesseManuell: r.groesse_manuell ?? false,
          imageUrl:       r.foto_url    ?? undefined,
          bodyExtra:      r.body_extra  ?? undefined,
          icon:       r.icon       ?? undefined,
          kategorie:  r.kategorie  ?? undefined,
        }))
        setMemories(mapped)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [bookId, tick])

  const phases = groupByPhase(memories, filter)

  return { memories, phases, loading, error, reload: () => setTick((t) => t + 1) }
}
