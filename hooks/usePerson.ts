'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface Person {
  id: string
  title: string
  description?: string
  coverUrl?: string
  rohtext?: string       // raw free-text for KI extraction (Etappe B+)
  // Date fields
  geburtsdatumText?: string
  geburtsdatumJahr?: number
  geburtsort?:       string
  sterbedatumText?:  string
  sterbedatumJahr?:  number
  sterbeort?:        string
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
      .select('id, title, description, cover_url, project_id')
      .eq('id', bookId)
      .single()
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) { setError(err.message); setLoading(false); return }
        // Fetch project fields for dates/location
        const projectId = data.project_id
        if (projectId) {
          supabase.from('projects').select(
            'geburtsdatum_text, geburtsdatum_jahr, geburtsort, sterbedatum_text, sterbedatum_jahr, sterbeort, rohtext'
          ).eq('id', projectId).single().then(({ data: proj }) => {
            if (cancelled) return
            setPerson({
              id:          data.id,
              title:       data.title,
              description: data.description    ?? undefined,
              coverUrl:    data.cover_url      ?? undefined,
              rohtext:          proj?.rohtext            ?? undefined,
              geburtsdatumText: proj?.geburtsdatum_text ?? undefined,
              geburtsdatumJahr: proj?.geburtsdatum_jahr ?? undefined,
              geburtsort:       proj?.geburtsort        ?? undefined,
              sterbedatumText:  proj?.sterbedatum_text  ?? undefined,
              sterbedatumJahr:  proj?.sterbedatum_jahr  ?? undefined,
              sterbeort:        proj?.sterbeort          ?? undefined,
            })
            setLoading(false)
          })
        } else {
          setPerson({
            id:          data.id,
            title:       data.title,
            description: data.description ?? undefined,
            coverUrl:    data.cover_url   ?? undefined,
          })
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [bookId, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { person, loading, error, reload }
}
