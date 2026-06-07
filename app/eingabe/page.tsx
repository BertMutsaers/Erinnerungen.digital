'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import NavSpacer from '@/components/NavSpacer'
import type { AnalyzeEntry } from '@/app/api/analyze-memory/route'

const BOOK_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

const inputCls = `w-full px-3 py-[10px] rounded-[10px] font-sans text-[15px] text-gray-900
  bg-white outline-none transition-colors
  border border-[rgba(0,0,0,0.08)] placeholder-gray-400
  focus:border-black`

export default function EingabePage() {
  const [text, setText]     = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState<{ msg: string; ok: boolean } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Batch analysis state
  const [missingCount,  setMissingCount]  = useState<number | null>(null)
  const [batchRunning,  setBatchRunning]  = useState(false)
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number; current: string } | null>(null)
  const [batchDone,     setBatchDone]     = useState(false)
  const batchDoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load count of memories without zeitgeschehen
  useEffect(() => {
    supabase
      .from('memories')
      .select('id', { count: 'exact', head: true })
      .eq('book_id', BOOK_ID)
      .or('body_extra.is.null,body_extra.eq.')
      .then(({ count }) => setMissingCount(count ?? 0))
  }, [])

  async function handleBatchAnalyze() {
    setBatchRunning(true)
    setBatchDone(false)
    setBatchProgress(null)

    try {
      const res = await fetch('/api/analyze-all-missing', { method: 'POST' })
      if (!res.ok || !res.body) throw new Error('API-Fehler')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const msg = JSON.parse(line)
            if (msg.type === 'progress') {
              setBatchProgress({ done: msg.done, total: msg.total, current: msg.current })
            }
            if (msg.type === 'complete') {
              setBatchProgress({ done: msg.processed, total: msg.total, current: '' })
              setBatchDone(true)
              setMissingCount(0)
              // Hide card after 3 seconds
              batchDoneTimer.current = setTimeout(() => setMissingCount(-1), 3000)
            }
          } catch { /* skip malformed lines */ }
        }
      }
    } catch (err) {
      showToast('Fehler: ' + String(err), false)
    } finally {
      setBatchRunning(false)
    }
  }

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSaving(true)

    try {
      // 1. KI analysiert und gibt Array zurück
      const res = await fetch('/api/analyze-memory', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ freitext: text }),
      })
      if (!res.ok) throw new Error(`KI-Fehler: ${res.status}`)
      const entries: AnalyzeEntry[] = await res.json()

      // 2. Alle Einträge sequenziell in Supabase speichern
      for (const ai of entries) {
        const { error } = await supabase.from('memories').insert({
          book_id:     BOOK_ID,
          title:       ai.titel || text.slice(0, 80),
          body:        ai.text  || text,
          happened_at: ai.datum_tag && ai.datum_monat && ai.datum_jahr
            ? `${ai.datum_jahr}-${String(ai.datum_monat).padStart(2,'0')}-${String(ai.datum_tag).padStart(2,'0')}`
            : null,
          datum_label: ai.datum_label || '',
          datum_jahr:  ai.datum_jahr,
          datum_monat: ai.datum_monat,
          datum_tag:   ai.datum_tag,
          card_size:   ai.card_size  || 'medium',
          kategorie:   ai.kategorie  || 'sonstiges',
          icon:        ai.icon       || null,
          body_extra:  ai.zeitgeschehen || null,
        })
        if (error) throw new Error(error.message)
      }

      const n = entries.length
      showToast(`✓ ${n} ${n === 1 ? 'Erinnerung' : 'Erinnerungen'} gespeichert`)
      setText('')
    } catch (err) {
      showToast('Fehler: ' + String(err), false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-[430px] min-h-screen bg-[#F2F2F7]">
      <header className="px-4 pt-10 pb-6">
        <h1 className="font-serif text-[30px] font-bold text-gray-900">Neue Erinnerung</h1>
      </header>

      <form onSubmit={handleSubmit} className="px-4 flex flex-col gap-4">
        <div>
          <label className="block text-[13px] text-gray-600 font-sans mb-2 leading-snug">
            Schreib einfach drauf los — Datum im Text genügt. Die KI erledigt den Rest.
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            placeholder={"Im März 1958 haben wir geheiratet…\nJanuar 1942 begann meine Fleischerlehre…\nAm 9. Mai 1953 bekam ich meinen Meisterbrief in Landshut."}
            className={`${inputCls} resize-none`}
            style={{ minHeight: '160px' }}
          />
        </div>

        <button
          type="submit"
          disabled={saving || !text.trim()}
          className={`w-full py-3.5 rounded-[10px] font-sans font-semibold text-[15px] transition-opacity
            ${saving || !text.trim()
              ? 'bg-gray-900 text-white opacity-40 cursor-not-allowed'
              : 'bg-gray-900 text-white active:opacity-80'
            }`}
        >
          {saving ? 'KI analysiert …' : 'Speichern & KI analysieren lassen'}
        </button>
      </form>

      {/* Batch analysis card — shown only when entries are missing */}
      {missingCount !== null && missingCount !== -1 && missingCount > 0 && (
        <div className="px-4 mt-4">
          <div className="rounded-[18px] bg-white flex flex-col gap-4" style={{ padding: 20 }}>

            {/* Header */}
            <h2 className="font-serif font-bold text-[18px] text-gray-900">
              🤖 Zeitgeschehen ergänzen
            </h2>

            {/* Description */}
            <p className="font-sans text-[14px] text-gray-500 leading-relaxed">
              Für bestehende Erinnerungen ohne historischen Kontext sucht die KI automatisch
              passende Zeitgeschehen-Texte heraus — persönlich formuliert und auf das Ereignis abgestimmt.
            </p>

            {/* Example box */}
            <div className="rounded-[10px] bg-[#F5F5F5] px-4 py-3">
              <p className="font-sans text-[13px] text-gray-500 italic leading-relaxed">
                „Im Sommer 1936, als Piet die Mittelschule beginnt, marschieren deutsche
                Truppen ins Rheinland — die Niederlande halten den Atem an."
              </p>
            </div>

            {/* Count */}
            <p className="font-sans text-[13px] text-gray-400">
              {missingCount} {missingCount === 1 ? 'Eintrag wartet' : 'Einträge warten'} noch
            </p>

            {/* Button / progress */}
            {batchRunning ? (
              <div className="flex flex-col gap-2">
                <p className="font-sans text-[13px] text-gray-500">
                  Analysiere {batchProgress ? batchProgress.done + 1 : 1} von {batchProgress?.total ?? missingCount} Einträgen…
                </p>
                {batchProgress?.current && (
                  <p className="font-sans text-[11px] text-gray-400 italic truncate">
                    „{batchProgress.current}"
                  </p>
                )}
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-900 rounded-full transition-all duration-500"
                    style={{
                      width: batchProgress && batchProgress.total > 0
                        ? `${(batchProgress.done / batchProgress.total) * 100}%`
                        : '0%'
                    }}
                  />
                </div>
              </div>
            ) : batchDone ? (
              <p className="font-sans text-[13px] font-medium" style={{ color: '#34C759' }}>
                ✓ Alle Einträge analysiert
              </p>
            ) : (
              <button
                onClick={handleBatchAnalyze}
                className="w-full py-3.5 rounded-[10px] bg-gray-900 text-white font-sans font-semibold text-[15px] active:opacity-80"
              >
                🔄 Jetzt analysieren
              </button>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50
          text-[13px] font-sans px-5 py-2.5 rounded-full shadow-lg whitespace-nowrap animate-fade-in
          ${toast.ok ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      <NavSpacer />
      <BottomNav />
    </main>
  )
}
