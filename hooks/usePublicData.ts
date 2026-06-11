'use client'

/**
 * Public data hooks for shared EB pages (/teilen/[token]/*).
 * All fetches go through SECURITY DEFINER RPCs — no direct table access.
 * Works with the anon key (no auth session required).
 */

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Memory } from '@/lib/types'
import { Story } from './useStories'
import { MediaItem, MediaType, MediaSize } from './useMedia'
import type { Album } from './useAlbums'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PublicProject {
  id:                  string
  titel:               string
  typ:                 string
  cover_url?:          string
  vorname?:            string
  nachname?:           string
  firmenname?:         string
  geburtsdatum_jahr?:  number
  geburtsdatum_text?:  string
  sterbedatum_jahr?:   number
  sterbedatum_text?:   string
  geburtsort?:         string
  sterbeort?:          string
}

// ── Row mappers ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMemory(r: Record<string, any>): Memory {
  return {
    id:             r.id,
    title:          r.title          ?? undefined,
    body:           r.body           ?? undefined,
    happenedAt:     r.happened_at    ?? undefined,
    datumLabel:     r.datum_label    ?? undefined,
    datumJahr:      r.datum_jahr,
    datumMonat:     r.datum_monat    ?? undefined,
    datumTag:       r.datum_tag      ?? undefined,
    location:       r.location       ?? undefined,
    cardSize:       (r.card_size  as Memory['cardSize'])  ?? 'medium',
    cardColor:      (r.card_color as Memory['cardColor']) ?? undefined,
    pinnedSize:     r.card_size ? (r.card_size as Memory['cardSize']) : undefined,
    groesseManuell: r.groesse_manuell ?? false,
    imageUrl:       r.foto_url       ?? undefined,
    icon:           r.icon           ?? undefined,
    kategorie:      r.kategorie      ?? undefined,
    bodyExtra:      r.body_extra     ?? undefined,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapStory(r: Record<string, any>): Story {
  return {
    id:        r.id,
    titel:     r.titel,
    inhalt:    r.inhalt    ?? undefined,
    tag:       r.tag       ?? undefined,
    erzaehler: r.erzaehler ?? undefined,
    fotoUrl:   r.foto_url  ?? undefined,
    sortOrder: r.sort_order ?? 0,
    createdAt: r.created_at ?? undefined,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMedia(r: Record<string, any>): MediaItem {
  return {
    id:           r.id,
    typ:          r.typ          as MediaType,
    url:          r.url,
    thumbnailUrl: r.thumbnail_url ?? undefined,
    storagePath:  r.storage_path  ?? undefined,
    titel:        r.titel         ?? undefined,
    beschreibung: r.beschreibung  ?? undefined,
    datumText:    r.datum_text    ?? undefined,
    albumId:      r.album_id      ?? undefined,
    datumJahr:    r.datum_jahr    ?? undefined,
    datumMonat:   r.datum_monat   ?? undefined,
    datumTag:     r.datum_tag     ?? undefined,
    groesse:      (r.groesse as MediaSize) ?? 'normal',
    dateigroesse: r.dateigroesse  ?? undefined,
    sortierung:   r.sortierung    ?? 0,
    createdAt:    r.created_at,
  }
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function usePublicProject(token: string) {
  const [project, setProject] = useState<PublicProject | null | 'not-found'>(null)

  useEffect(() => {
    if (!token) return
    supabase.rpc('get_project_by_share_token', { p_token: token }).then(({ data }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = data as any[] | null
      if (!rows || rows.length === 0) { setProject('not-found'); return }
      setProject(rows[0] as PublicProject)
    })
  }, [token])

  return project
}

export function usePublicMemories(token: string) {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    supabase.rpc('get_memories_by_share_token', { p_token: token }).then(({ data }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMemories(((data as any[]) ?? []).map(mapMemory))
      setLoading(false)
    })
  }, [token])

  return { memories, loading }
}

export function usePublicStories(token: string) {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    supabase.rpc('get_stories_by_share_token', { p_token: token }).then(({ data }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setStories(((data as any[]) ?? []).map(mapStory).sort((a, b) => a.sortOrder - b.sortOrder))
      setLoading(false)
    })
  }, [token])

  return { stories, loading }
}

export function usePublicMedia(token: string) {
  const [items,   setItems]   = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    supabase.rpc('get_media_by_share_token', { p_token: token }).then(({ data }) => {
      setItems(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((data as any[]) ?? [])
          .map(mapMedia)
          .filter((i) => !i.albumId) // individual items only (no album photos)
          .sort((a, b) => (a.datumJahr ?? 9999) - (b.datumJahr ?? 9999)),
      )
      setLoading(false)
    })
  }, [token])

  return { items, loading }
}

export function usePublicAlbums(token: string) {
  const [albums,  setAlbums]  = useState<Album[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    setLoading(true)

    async function load() {
      // 1. Fetch album metadata
      const { data: albumData } = await supabase
        .rpc('get_albums_by_share_token', { p_token: token })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const albumRows = (albumData as any[]) ?? []

      if (albumRows.length === 0) { setAlbums([]); setLoading(false); return }

      // 2. Fetch all media to build preview URLs (reuses existing RPC)
      const { data: mediaData } = await supabase
        .rpc('get_media_by_share_token', { p_token: token })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mediaRows = (mediaData as any[]) ?? []

      // Group photo URLs by album_id, sorted by created_at
      const photosByAlbum = new Map<string, string[]>()
      for (const m of mediaRows.sort((a: {created_at: string}, b: {created_at: string}) => a.created_at.localeCompare(b.created_at))) {
        if (!m.album_id) continue
        const arr = photosByAlbum.get(m.album_id) ?? []
        arr.push(m.url)
        photosByAlbum.set(m.album_id, arr)
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
          coverUrl:    r.cover_url   ?? photos[0] ?? undefined,
          sortierung:  r.sortierung  ?? 0,
          photoCount:  photos.length,
          previewUrls: photos.slice(0, 3),
        }
      }))
      setLoading(false)
    }

    load()
  }, [token])

  return { albums, loading }
}

// ── Derived helpers ───────────────────────────────────────────────────────────

export function projectYears(p: PublicProject): string {
  const birth = p.geburtsdatum_text ?? (p.geburtsdatum_jahr ? String(p.geburtsdatum_jahr) : null)
  const death = p.sterbedatum_text  ?? (p.sterbedatum_jahr  ? String(p.sterbedatum_jahr)  : null)
  if (birth && death) return `${birth} – ${death}`
  if (birth)          return `* ${birth}`
  return ''
}
