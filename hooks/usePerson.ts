'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface Person {
  id: string
  title: string
  description?: string
  coverUrl?: string
}

interface UsePersonResult {
  person: Person | null
  loading: boolean
  error: string | null
  reload: () => void
}

export function usePerson(bookId: string): UsePersonResult {
  const [person,  setPerson]  = useState<Person | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [tick,    setTick]    = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supabase
      .from('books')
      .select('id, title, description, cover_url')
      .eq('id', bookId)
      .single()
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) { setError(err.message); setLoading(false); return }
        setPerson({
          id:          data.id,
          title:       data.title,
          description: data.description ?? undefined,
          coverUrl:    data.cover_url   ?? undefined,
        })
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [bookId, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { person, loading, error, reload }
}
