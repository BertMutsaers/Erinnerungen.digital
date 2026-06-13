'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useMemories } from '@/hooks/useMemories'
import { usePerson } from '@/hooks/usePerson'
import { FILTER_CHIPS, GroupingMode, groupByPhase, groupByDecade, groupByNone, decadeChips } from '@/lib/phases'
import { Memory } from '@/lib/types'
import MemoryCard from './MemoryCard'
import EditSheet from './EditSheet'
import NewMemorySheet from './NewMemorySheet'
import BottomNav from './BottomNav'
import Link from 'next/link'
import { TimelineSkeleton } from './MemoryCardSkeleton'
import ScrollIndicator from './ScrollIndicator'
import NavSpacer from './NavSpacer'
import PolaroidIntro from './PolaroidIntro'
import type { ExtractResult } from '@/app/api/extract-rohtext/route'
import KiReviewScreen from './KiReviewScreen'
import ProjectEditSheet from './ProjectEditSheet'
import { supabase } from '@/lib/supabase'

const DEMO_BOOK_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

import type { Person } from '@/hooks/usePerson'

function formatLifespan(p: Person): string {
  const geb  = p.geburtsdatumText ?? (p.geburtsdatumJahr ? String(p.geburtsdatumJahr) : null)
  const ste  = p.sterbedatumText  ?? (p.sterbedatumJahr  ? String(p.sterbedatumJahr)  : null)
  const gOrt = p.geburtsort
  const sOrt = p.sterbeort

  const gebPart = [geb, gOrt].filter(Boolean).join(' · ')
  const stePart = [ste, sOrt].filter(Boolean).join(' · ')

  if (gebPart && stePart) return `${gebPart} — ${stePart}`
  if (gebPart)            return gebPart
  return ''
}

interface Props { bookId?: string; basePath?: string; readOnly?: boolean }

export default function TimelineScreen({ bookId = DEMO_BOOK_ID, basePath = '', readOnly = false }: Props) {
  const BOOK_ID = bookId
  const router = useRouter()
  const [filter,       setFilter]       = useState('alle')
  const [editing,      setEditing]      = useState<Memory | null>(null)
  const [toast,        setToast]        = useState<string | null>(null)
  const [localCoverUrl,setLocalCoverUrl]= useState<string | null>(null)
  const [newMemoryOpen,setNewMemoryOpen]= useState(false)
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('phase')
  const [kiLoading,    setKiLoading]    = useState(false)
  const [kiResult,     setKiResult]     = useState<ExtractResult | null>(null)
  const [kiError,      setKiError]      = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingProject, setEditingProject] = useState<Record<string, any> | null>(null)

  const lsKey = `grouping-${BOOK_ID}`

  // Load persisted grouping mode
  useEffect(() => {
    try {
      const saved = localStorage.getItem(lsKey) as GroupingMode | null
      if (saved && ['phase','decade','none'].includes(saved)) setGroupingMode(saved)
      else if (BOOK_ID !== DEMO_BOOK_ID) setGroupingMode('none')
    } catch { /* ignore */ }
  }, [BOOK_ID, lsKey])

  function saveGrouping(mode: GroupingMode) {
    setGroupingMode(mode)
    setFilter('alle')
    try { localStorage.setItem(lsKey, mode) } catch { /* ignore */ }
  }

  async function openSettings() {
    const { data } = await supabase
      .from('projects')
      .select('id, titel, vorname, nachname, cover_url, share_token, share_active, in_galerie, show_zeitgeschehen, geburtsdatum_text, geburtsort, sterbedatum_text, sterbeort')
      .eq('id', BOOK_ID)
      .single()
    if (!data) return
    const saved = typeof window !== 'undefined'
      ? localStorage.getItem(`grouping-${BOOK_ID}`) as GroupingMode | null
      : null
    setEditingProject({
      ...data,
      coverUrl:         data.cover_url,
      shareToken:       data.share_token,
      shareActive:      data.share_active   ?? false,
      inGalerie:        data.in_galerie     ?? false,
      showZeitgeschehen:data.show_zeitgeschehen ?? true,
      groupingMode:     saved ?? 'none',
      geburtsdatumText: data.geburtsdatum_text,
      sterbedatumText:  data.sterbedatum_text,
    })
  }

  const { person, reload: reloadPerson }    = usePerson(BOOK_ID)
  const { memories, loading, error, reload } = useMemories(BOOK_ID)

  // Compute phases from raw memories based on grouping mode
  const phases = loading ? [] :
    groupingMode === 'decade' ? groupByDecade(memories, filter) :
    groupingMode === 'none'   ? groupByNone(memories) :
    groupByPhase(memories, filter)

  // Compute active chips
  const activeChips =
    groupingMode === 'decade' ? decadeChips(memories) :
    groupingMode === 'none'   ? [] :
    FILTER_CHIPS.filter(c => c.key === 'alle' || phases.some(p => p.key === c.key) || memories.some(m => m.kategorie === c.key))

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const analyzeRohtext = useCallback(async () => {
    if (!person?.id) return
    setKiLoading(true)
    setKiError(null)
    setKiResult(null)
    try {
      const res = await fetch('/api/extract-rohtext', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ projectId: person.id }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      setKiResult(await res.json())
    } catch (e) {
      setKiError(String(e))
    } finally {
      setKiLoading(false)
    }
  }, [person?.id])

  // ── Etappe C/D: Review-Screen (overlay, solange kiResult gesetzt ist) ───────
  if (kiResult) {
    return (
      <KiReviewScreen
        result={kiResult}
        projectId={BOOK_ID}
        onDiscard={() => { setKiResult(null); setKiError(null) }}
        onSaved={() => {
          // Gespeichert: Review-Screen schließen, Zeitstrahl + Person neu laden
          setKiResult(null)
          setKiError(null)
          reload()        // memories neu laden → Zeitstrahl füllt sich
          reloadPerson()  // Stammdaten neu laden (Geburt/Tod/Orte jetzt gesetzt)
        }}
      />
    )
  }

  return (
    <main className="mx-auto w-full max-w-[430px] min-h-screen bg-[#F2F2F7]">

      {/* ── Polaroid intro (with built-in upload) ───────────────────── */}
      <PolaroidIntro
        coverUrl={localCoverUrl ?? person?.coverUrl}
        name={person?.title ?? ''}
        years={[person?.geburtsdatumJahr, person?.sterbedatumJahr].filter(Boolean).join(' – ')}
        bookId={BOOK_ID}
        onUploaded={(url) => { setLocalCoverUrl(url); reloadPerson() }}
        onRemoved={() => { setLocalCoverUrl(null); reloadPerson() }}
        onToast={showToast}
      />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="px-4 pt-10 pb-3 flex items-start justify-between gap-3">
        <div className="flex-1">
          <h1 className="font-serif text-[30px] font-bold leading-tight text-gray-900">
            {person?.title ?? ''}
          </h1>
          {person && (
            <p className="font-sans text-[13px] text-gray-400 mt-0.5">
              {formatLifespan(person)}
            </p>
          )}
        </div>
        {!readOnly && (
          <button
            onClick={openSettings}
            className="mt-2 flex-shrink-0 w-9 h-9 rounded-full bg-white flex items-center justify-center active:opacity-60"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.10)' }}
            aria-label="Einstellungen"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3C3C3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        )}
      </header>

      {/* ── Filter chips ─────────────────────────────────────────────── */}
      {!loading && activeChips.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {activeChips.map((chip) => {
            const selected = filter === chip.key
            return (
              <button key={chip.key} onClick={() => setFilter(chip.key)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-sans font-medium transition-colors
                  ${selected ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
                {chip.label}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────────── */}
      {error && <p className="px-4 text-sm text-red-500 font-sans">{error}</p>}

      {loading ? <TimelineSkeleton /> : phases.length === 0 ? (
        /* ── Empty state ──────────────────────────────────────────────── */
        <div className="px-6 py-10 flex flex-col items-center text-center gap-3">
          <p className="font-serif text-[22px] font-bold text-gray-900 leading-snug">
            Noch keine Ereignisse.
          </p>
          <p className="font-sans text-[14px] leading-relaxed" style={{ color: '#9B9B9B', maxWidth: 280 }}>
            Tippe auf <strong style={{ color: '#3C3C3E' }}>⊕</strong> unten rechts, um das erste Ereignis im Leben dieser Person hinzuzufügen.
          </p>
          {!person?.coverUrl && !localCoverUrl && (
            <p className="font-sans text-[13px] mt-2 leading-relaxed" style={{ color: '#B0B0B0', maxWidth: 260 }}>
              Tippe auf das Polaroid oben, um ein Profilfoto hinzuzufügen.
            </p>
          )}

          {/* ── KI-Analyse-Button (nur wenn rohtext vorhanden und nicht readOnly) ── */}
          {person?.rohtext && !readOnly && !kiResult && (
            <div className="mt-5 w-full max-w-[320px]">
              <button
                onClick={analyzeRohtext}
                disabled={kiLoading}
                className="w-full py-3.5 px-5 rounded-[14px] font-sans text-[15px] font-semibold flex items-center justify-center gap-2 active:opacity-70 disabled:opacity-40 transition-opacity"
                style={{ background: '#1C1C1E', color: '#fff' }}
              >
                {kiLoading ? (
                  <>
                    <span className="animate-spin inline-block text-[16px]">⏳</span>
                    <span>Text wird analysiert …</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Zeitstrahl aus Text erstellen</span>
                  </>
                )}
              </button>
              <p className="font-sans text-[11px] mt-2 leading-relaxed" style={{ color: '#AEAEB2' }}>
                KI extrahiert Ereignisse aus deinem Text. Nichts wird gespeichert.
              </p>
            </div>
          )}

          {kiError && (
            <p className="font-sans text-[13px] mt-2" style={{ color: '#FF3B30', maxWidth: 280 }}>
              ⚠ {kiError}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col px-4">
          {phases.map((phase, phaseIdx) => (
            <section key={phase.key} style={{ marginTop: phaseIdx === 0 ? 8 : 24 }}>
              <p className="text-[11px] uppercase tracking-widest font-sans text-gray-400 mb-2">
                {phase.label}
              </p>
              <div className="grid grid-cols-2 gap-[11px]" id={`section-${phase.key}`} data-phase-key={phase.key}>
                {phase.memories.map((mem) => (
                  <MemoryCard
                    key={mem.id}
                    memory={mem}
                    onClick={(m) => router.push(`/memories/${m.id}?from=${encodeURIComponent(basePath + '/zeitstrahl')}`)}
                    onLongPress={readOnly ? () => {} : setEditing}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}


      {/* Floating ⊕ button — hidden in readOnly mode */}
      {!readOnly && (
        <button
          onClick={() => setNewMemoryOpen(true)}
          className="fixed z-30 flex items-center justify-center rounded-full bg-gray-900 text-white active:opacity-80"
          style={{ bottom: 90, right: 20, width: 48, height: 48, fontSize: 24, lineHeight: 1, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
          aria-label="Neue Erinnerung"
        >
          ⊕
        </button>
      )}

      <ScrollIndicator phases={phases.map((p) => ({ key: p.key, label: p.label }))} />

      {!readOnly && (
        <>
          <NewMemorySheet
            open={newMemoryOpen}
            bookId={BOOK_ID}
            onClose={() => setNewMemoryOpen(false)}
            onSaved={() => { reload(); showToast('✓ Gespeichert') }}
          />
          <EditSheet
            memory={editing}
            bookId={BOOK_ID}
            onClose={() => setEditing(null)}
            onSaved={() => { reload(); showToast('✓ Gespeichert') }}
            onDeleted={() => { reload(); showToast('Erinnerung gelöscht') }}
          />
        </>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[70]
          bg-gray-900 text-white text-[13px] font-sans px-5 py-2.5
          rounded-full shadow-lg whitespace-nowrap animate-fade-in">
          {toast}
        </div>
      )}

      <NavSpacer />
      <BottomNav
        basePath={basePath}
        zeitstrahlSuffix={basePath === '/demo' ? '' : '/zeitstrahl'}
      />

      <ProjectEditSheet
        project={editingProject as Parameters<typeof ProjectEditSheet>[0]['project']}
        onClose={() => setEditingProject(null)}
        onSaved={() => { setEditingProject(null); reloadPerson(); reload() }}
        onDeleted={() => { setEditingProject(null); router.replace('/dashboard') }}
        onShareChanged={() => {}}
      />
    </main>
  )
}
