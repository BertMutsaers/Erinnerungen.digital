'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export type PhotoSize = 'normal' | 'wide' | 'tall'

export interface Photo {
  id:           string
  storagePath:  string
  fotoUrl:      string
  beschriftung?: string
  jahr?:        number
  groesse:      PhotoSize
  sortOrder:    number
}

export function usePhotos(bookId: string) {
  const [photos,  setPhotos]  = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [tick,    setTick]    = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supabase
      .from('photos')
      .select('id, storage_path, foto_url, beschriftung, jahr, groesse, sort_order')
      .eq('book_id', bookId)
      .order('sort_order', { ascending: true })
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) { setError(err.message); setLoading(false); return }
        setPhotos((data ?? []).map((r) => ({
          id:           r.id,
          storagePath:  r.storage_path,
          fotoUrl:      r.foto_url,
          beschriftung: r.beschriftung ?? undefined,
          jahr:         r.jahr         ?? undefined,
          groesse:      (r.groesse as PhotoSize) ?? 'normal',
          sortOrder:    r.sort_order   ?? 0,
        })))
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [bookId, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { photos, loading, error, reload }
}
