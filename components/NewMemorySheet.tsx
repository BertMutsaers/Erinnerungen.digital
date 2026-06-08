'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { AnalyzeEntry } from '@/app/api/analyze-memory/route'

const DEMO_BOOK_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

interface Props {
  open:    boolean
  bookId?: string
  onClose: () => void
  onSaved: () => void
}

export default function NewMemorySheet({ open, onClose, onSaved, bookId = DEMO_BOOK_ID }: Props) {
  const BOOK_ID = bookId
  const [text,   setText]   = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      setTimeout(() => textareaRef.current?.focus(), 300)
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  async function handleSave() {
    if (!text.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/analyze-memory', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ freitext: text }),
      })
      if (!res.ok) throw new Error(`KI-Fehler: ${res.status}`)
      const entries: AnalyzeEntry[] = await res.json()

      for (const ai of entries) {
        const { error: dbErr } = await supabase.from('memories').insert({
          book_id:     BOOK_ID,
          title:       ai.titel        || text.slice(0, 80),
          body:        ai.text         || text,
          happened_at: ai.datum_tag && ai.datum_monat && ai.datum_jahr
            ? `${ai.datum_jahr}-${String(ai.datum_monat).padStart(2,'0')}-${String(ai.datum_tag).padStart(2,'0')}`
            : null,
          datum_label: ai.datum_label  || '',
          datum_jahr:  ai.datum_jahr,
          datum_monat: ai.datum_monat,
          datum_tag:   ai.datum_tag,
          card_size:   ai.card_size    || 'medium',
          kategorie:   ai.kategorie    || 'sonstiges',
          icon:        ai.icon         || null,
          body_extra:  ai.zeitgeschehen || null,
        })
        if (dbErr) throw new Error(dbErr.message)
      }

      setText('')
      onSaved()
      onClose()
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[430px] rounded-t-3xl bg-white shadow-2xl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-5 pb-8 flex flex-col gap-4">
          <h2 className="font-serif text-[22px] font-bold text-gray-900">Neue Erinnerung</h2>

          <p className="font-sans text-[13px] text-gray-500 leading-snug -mt-2">
            Schreib einfach drauf los — Datum im Text genügt. Die KI erledigt den Rest.
          </p>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Im März 1958 haben wir geheiratet…\nJanuar 1942 begann meine Fleischerlehre…\nAm 9. Mai 1953 bekam ich meinen Meisterbrief in Landshut."}
            className="w-full px-3 py-3 rounded-[12px] font-sans text-[15px] text-gray-900 bg-[#F2F2F7] outline-none border border-[rgba(0,0,0,0.06)] placeholder-gray-400 focus:border-gray-400 resize-none"
            style={{ minHeight: 160 }}
          />

          {error && <p className="font-sans text-[12px] text-red-500">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving || !text.trim()}
            className="w-full py-3.5 rounded-[10px] font-sans font-semibold text-[15px] bg-gray-900 text-white disabled:opacity-40 active:opacity-80"
          >
            {saving ? 'KI analysiert …' : 'Speichern & KI analysieren lassen'}
          </button>
        </div>
      </div>
    </>
  )
}
