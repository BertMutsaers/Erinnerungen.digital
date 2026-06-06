'use client'

import { useEffect, useState } from 'react'
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
}

export function usePerson(bookId: string): UsePersonResult {
  const [person, setPerson]   = useState<Person | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
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
  }, [bookId])

  return { person, loading, error }
}
