'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface Story {
  id:         string
  titel:      string
  inhalt?:    string
  tag?:       string
  erzaehler?: string
  fotoUrl?:   string
  sortOrder:  number
  createdAt?: string
}

export function formatStoryDate(createdAt?: string): string {
  if (!createdAt) return ''
  return new Date(createdAt).toLocaleDateString('de-DE', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function useStories(bookId: string) {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [tick,    setTick]    = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supabase
      .from('stories')
      .select('id, titel, inhalt, tag, erzaehler, foto_url, sort_order, created_at')
      .eq('book_id', bookId)
      .order('sort_order', { ascending: true })
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) { setError(err.message); setLoading(false); return }
        setStories((data ?? []).map((r) => ({
          id:        r.id,
          titel:     r.titel,
          inhalt:    r.inhalt    ?? undefined,
          tag:       r.tag       ?? undefined,
          erzaehler: r.erzaehler ?? undefined,
          fotoUrl:   r.foto_url   ?? undefined,
          sortOrder: r.sort_order  ?? 0,
          createdAt: r.created_at  ?? undefined,
        })))
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [bookId, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { stories, loading, error, reload }
}
