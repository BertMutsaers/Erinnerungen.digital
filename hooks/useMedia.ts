'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export type MediaType = 'foto' | 'video' | 'audio' | 'dokument'
export type MediaSize = 'normal' | 'wide' | 'tall'

export interface MediaItem {
  id:            string
  typ:           MediaType
  url:           string
  thumbnailUrl?: string
  storagePath?:  string
  titel?:        string
  beschreibung?: string
  datumJahr?:    number
  datumMonat?:   number
  datumTag?:     number
  datumText?:    string
  albumId?:      string
  groesse:       MediaSize
  dateigroesse?: number
  sortierung:    number
  createdAt:     string
}

/**
 * Returns the display name for a media item.
 * Prefers the user-set titel; falls back to the filename derived from the URL
 * (last path segment, URL-decoded, query params stripped).
 */
export function displayTitel(item: Pick<MediaItem, 'titel' | 'url'>): string {
  if (item.titel?.trim()) return item.titel.trim()
  try {
    const path = new URL(item.url).pathname
    const segment = path.split('/').filter(Boolean).pop() ?? ''
    // Strip leading timestamp prefix (digits + hyphen) added during upload
    return decodeURIComponent(segment).replace(/^\d{10,}-/, '')
  } catch {
    return item.url
  }
}

export function formatMediaDate(item: Pick<MediaItem, 'datumJahr'|'datumMonat'|'datumTag'|'datumText'>): string | null {
  // Prefer the user-entered text (e.g. "Sommer 1958")
  if (item.datumText?.trim()) return item.datumText.trim()
  if (!item.datumJahr) return null
  const MONATE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
  if (item.datumTag && item.datumMonat) return `${item.datumTag}. ${MONATE[item.datumMonat - 1]} ${item.datumJahr}`
  if (item.datumMonat) return `${MONATE[item.datumMonat - 1]} ${item.datumJahr}`
  return String(item.datumJahr)
}

export function useMedia(bookId: string, filterTyp?: MediaType) {
  const [items,   setItems]   = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [tick,    setTick]    = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    let q = supabase
      .from('media')
      .select('id, typ, url, thumbnail_url, storage_path, titel, beschreibung, datum_text, datum_jahr, datum_monat, datum_tag, groesse, dateigroesse, sortierung, created_at, album_id')
      .eq('book_id', bookId)
      .order('datum_jahr',  { ascending: true, nullsFirst: false })
      .order('datum_monat', { ascending: true, nullsFirst: false })
      .order('datum_tag',   { ascending: true, nullsFirst: false })
      .order('created_at',  { ascending: true })

    if (filterTyp) q = q.eq('typ', filterTyp)
    // Only show media not belonging to an album (album items appear inside AlbumCard)
    q = q.filter('album_id', 'is', null)

    q.then(({ data, error: err }) => {
      if (cancelled) return
      if (err) { setError(err.message); setLoading(false); return }
      setItems((data ?? []).map((r) => ({
        id:           r.id,
        typ:          r.typ as MediaType,
        url:          r.url,
        thumbnailUrl: r.thumbnail_url ?? undefined,
        storagePath:  r.storage_path  ?? undefined,
        titel:        r.titel         ?? undefined,
        beschreibung: r.beschreibung  ?? undefined,
        datumText:    r.datum_text    ?? undefined,
        albumId:      r.album_id     ?? undefined,
        datumJahr:    r.datum_jahr    ?? undefined,
        datumMonat:   r.datum_monat   ?? undefined,
        datumTag:     r.datum_tag     ?? undefined,
        groesse:      (r.groesse as MediaSize) ?? 'normal',
        dateigroesse: r.dateigroesse  ?? undefined,
        sortierung:   r.sortierung    ?? 0,
        createdAt:    r.created_at,
      })))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [bookId, filterTyp, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { items, loading, error, reload }
}

// ── Helpers ──────────────────────────────────────────────────────────────
export function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([^&\s?/]+)/)
  return m?.[1] ?? null
}

export function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/)
  return m?.[1] ?? null
}

export function getYouTubeThumbnail(url: string): string | null {
  const id = getYouTubeId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}

/** Returns an embed URL with autoplay=1, or null if not recognised. */
export function getVideoEmbed(url: string): string | null {
  const ytId = getYouTubeId(url)
  if (ytId) return `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`

  const vmId = getVimeoId(url)
  if (vmId) return `https://player.vimeo.com/video/${vmId}?autoplay=1`

  return null
}

/** Fetch Vimeo thumbnail via oEmbed (browser-safe, CORS allowed). */
export async function fetchVimeoThumbnail(url: string): Promise<string | null> {
  try {
    const res  = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`)
    const data = await res.json()
    return (data.thumbnail_url as string) ?? null
  } catch { return null }
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
