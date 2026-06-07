'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface Album {
  id:          string
  titel:       string
  datumText?:  string
  datumJahr?:  number
  datumMonat?: number
  datumTag?:   number
  coverUrl?:   string
  sortierung:  number
  photoCount:  number
  previewUrls: string[]   // first ≤3 photo URLs for stack
}

export function useAlbums(bookId: string) {
  const [albums,  setAlbums]  = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [tick,    setTick]    = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    supabase
      .from('albums')
      .select(`
        id, titel, datum_text, datum_jahr, datum_monat, datum_tag,
        cover_url, sortierung,
        media(id, url, created_at)
      `)
      .eq('book_id', bookId)
      .order('datum_jahr',  { ascending: true, nullsFirst: false })
      .order('created_at',  { ascending: true })
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) { setError(err.message); setLoading(false); return }
        setAlbums((data ?? []).map((r) => {
          const photos = (r.media as { id: string; url: string; created_at: string }[] ?? [])
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
          return {
            id:         r.id,
            titel:      r.titel,
            datumText:  r.datum_text  ?? undefined,
            datumJahr:  r.datum_jahr  ?? undefined,
            datumMonat: r.datum_monat ?? undefined,
            datumTag:   r.datum_tag   ?? undefined,
            coverUrl:   r.cover_url   ?? photos[0]?.url ?? undefined,
            sortierung: r.sortierung  ?? 0,
            photoCount: photos.length,
            previewUrls: photos.slice(0, 3).map((p) => p.url),
          }
        }))
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [bookId, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { albums, loading, error, reload }
}
