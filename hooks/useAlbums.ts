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

    // Two separate queries — avoids the PostgREST embedded-join schema-cache issue
    // that caused albums to silently disappear when the FK cache was stale.
    async function load() {
      // 1. Fetch albums
      const { data: albumRows, error: albumErr } = await supabase
        .from('albums')
        .select('id, titel, datum_text, datum_jahr, datum_monat, datum_tag, cover_url, sortierung')
        .eq('book_id', bookId)
        .order('datum_jahr', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })

      if (cancelled) return
      if (albumErr) { setError(albumErr.message); setLoading(false); return }
      if (!albumRows || albumRows.length === 0) { setAlbums([]); setLoading(false); return }

      // 2. Fetch photos for all albums in one query
      const albumIds = albumRows.map((r) => r.id)
      const { data: photoRows } = await supabase
        .from('media')
        .select('id, url, created_at, album_id')
        .in('album_id', albumIds)
        .order('created_at', { ascending: true })

      if (cancelled) return

      // Group photos by album_id
      const photosByAlbum = new Map<string, { id: string; url: string }[]>()
      for (const p of photoRows ?? []) {
        if (!p.album_id) continue
        const arr = photosByAlbum.get(p.album_id) ?? []
        arr.push({ id: p.id, url: p.url })
        photosByAlbum.set(p.album_id, arr)
      }

      setAlbums(albumRows.map((r) => {
        const photos = photosByAlbum.get(r.id) ?? []
        return {
          id:          r.id,
          titel:       r.titel,
          datumText:   r.datum_text  ?? undefined,
          datumJahr:   r.datum_jahr  ?? undefined,
          datumMonat:  r.datum_monat ?? undefined,
          datumTag:    r.datum_tag   ?? undefined,
          coverUrl:    r.cover_url   ?? photos[0]?.url ?? undefined,
          sortierung:  r.sortierung  ?? 0,
          photoCount:  photos.length,
          previewUrls: photos.slice(0, 3).map((p) => p.url),
        }
      }))
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [bookId, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { albums, loading, error, reload }
}
