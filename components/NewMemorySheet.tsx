'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { AnalyzeEntry } from '@/app/api/analyze-memory/route'


const THIS_YEAR = new Date().getFullYear()
const YEAR_RE   = /\b(18|19|20)\d{2}\b/
const DATE_RE   = /\d{1,2}\.\d{1,2}\.\d{4}/

function lineHasDate(line: string): boolean {
  if (DATE_RE.test(line)) return true
  const m = line.match(YEAR_RE)
  if (!m) return false
  const year = parseInt(m[0])
  return year >= 1800 && year <= THIS_YEAR
}

// Pre-split table into individual event lines before sending to KI
function splitIntoEvents(text: string): string[] {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && lineHasDate(l))
}

function isTableMode(text: string): boolean {
  const events = splitIntoEvents(text)
  return events.length >= 3
}

interface Props {
  open:    boolean
  bookId?: string
  onClose: () => void
  onSaved: () => void
}

async function analyzeChunk(freitext: string): Promise<AnalyzeEntry[]> {
  const res = await fetch('/api/analyze-memory', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ freitext }),
  })
  if (!res.ok) throw new Error(`KI-Fehler: ${res.status}`)
  return res.json()
}

export default function NewMemorySheet({ open, onClose, onSaved, bookId }: Props) {
  const BOOK_ID = bookId
  const [text,     setText]     = useState('')
  const [saving,   setSaving]   = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error,    setError]    = useState<string | null>(null)
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

  const tableMode = isTableMode(text)

  async function handleSave() {
    if (!text.trim()) return
    setSaving(true)
    setError(null)
    setProgress(null)

    try {
      let allEntries: AnalyzeEntry[] = []

      if (tableMode) {
        // Each line becomes ONE KI call (jede Zeile = ein Ereignis)
        const lines = splitIntoEvents(text)
        setProgress({ done: 0, total: lines.length })

        // Process in batches of 10 parallel requests
        const BATCH = 10
        for (let i = 0; i < lines.length; i += BATCH) {
          const batch = lines.slice(i, i + BATCH)
          const results = await Promise.all(batch.map(analyzeChunk))
          allEntries = allEntries.concat(results.flat())
          setProgress({ done: Math.min(i + BATCH, lines.length), total: lines.length })
        }
      } else {
        // Single request for normal text
        allEntries = await analyzeChunk(text)
      }

      // Save all entries
      setProgress({ done: 0, total: allEntries.length })
      for (let i = 0; i < allEntries.length; i++) {
        const ai = allEntries[i]
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
        setProgress({ done: i + 1, total: allEntries.length })
      }

      setText('')
      onSaved()
      onClose()
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
      setProgress(null)
    }
  }

  const lineCount = text.split('\n').filter(l => l.trim()).length

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[430px] rounded-t-3xl bg-white shadow-2xl">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-5 pb-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-[22px] font-bold text-gray-900">Neue Erinnerung</h2>
            {tableMode && lineCount > 0 && (
              <span className="font-sans text-[12px] bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">
                Tabellen-Modus · {lineCount} Zeilen
              </span>
            )}
          </div>

          <p className="font-sans text-[13px] text-gray-500 leading-snug -mt-2">
            Schreib drauf los — Datum im Text genügt. Tabellen und Listen werden automatisch erkannt.
          </p>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            placeholder={"Im März 1958 haben wir geheiratet…\n\nOder Tabelle:\n24.02.1955  Geburt in San Francisco\n1955        Adoption durch Paul Jobs"}
            className="w-full px-3 py-3 rounded-[12px] font-sans text-[15px] text-gray-900 bg-[#F2F2F7] outline-none border border-[rgba(0,0,0,0.06)] placeholder-gray-400 focus:border-gray-400 resize-none"
            style={{ minHeight: 160 }}
          />

          {error && <p className="font-sans text-[12px] text-red-500">{error}</p>}

          {/* Progress */}
          {saving && progress && (
            <div>
              <p className="font-sans text-[13px] text-gray-500 mb-1">
                {`${progress.done} / ${progress.total} ${tableMode ? 'Zeilen' : 'Einträge'} verarbeitet …`}
              </p>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gray-900 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !text.trim()}
            className="w-full py-3.5 rounded-[10px] font-sans font-semibold text-[15px] bg-gray-900 text-white disabled:opacity-40 active:opacity-80"
          >
            {saving
              ? 'KI analysiert …'
              : tableMode && lineCount > 3
                ? `${lineCount} Ereignisse speichern & analysieren`
                : 'Speichern & KI analysieren lassen'}
          </button>
        </div>
      </div>
    </>
  )
}
