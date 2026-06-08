'use client'

import { useState, useEffect } from 'react'
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

const GROUPING_LABELS: Record<GroupingMode, string> = {
  phase:  'Lebensphase (KI)',
  decade: 'Jahrzehnt',
  none:   'Keine Gruppierung',
}

export default function TimelineScreen({ bookId = DEMO_BOOK_ID, basePath = '', readOnly = false }: Props) {
  const BOOK_ID = bookId
  const router = useRouter()
  const [filter,       setFilter]       = useState('alle')
  const [editing,      setEditing]      = useState<Memory | null>(null)
  const [toast,        setToast]        = useState<string | null>(null)
  const [localCoverUrl,setLocalCoverUrl]= useState<string | null>(null)
  const [newMemoryOpen,setNewMemoryOpen]= useState(false)
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('phase')
  const [showGrouping, setShowGrouping] = useState(false)

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
    setShowGrouping(false)
    try { localStorage.setItem(lsKey, mode) } catch { /* ignore */ }
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
      <header className="px-4 pt-10 pb-3">
        <h1 className="font-serif text-[30px] font-bold leading-tight text-gray-900">
          {person?.title ?? ''}
        </h1>
        {person && (
          <p className="font-sans text-[13px] text-gray-400 mt-0.5">
            {formatLifespan(person)}
          </p>
        )}
      </header>

      {/* ── Filter chips + ⚙️ grouping button ─────────────────────────── */}
      {!loading && (
        <div className="flex items-center gap-2 px-4 pb-4">
          {/* Chips (scrollable) */}
          {activeChips.length > 1 && (
            <div className="flex gap-2 overflow-x-auto flex-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
          {/* ⚙️ Grouping button */}
          <button
            onClick={() => setShowGrouping(true)}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 active:opacity-60"
            title="Gruppierung ändern"
          >
            <span style={{ fontSize: 14 }}>⚙️</span>
          </button>
        </div>
      )}

      {/* ── Grouping settings sheet ───────────────────────────────────── */}
      {showGrouping && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50 backdrop-blur-sm" onClick={() => setShowGrouping(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[430px] bg-white rounded-t-3xl shadow-2xl pb-8">
            <div className="flex justify-center pt-3 pb-4">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <p className="font-sans text-[13px] font-semibold text-gray-400 text-center mb-4 uppercase tracking-widest px-5">
              Ansicht gruppieren nach
            </p>
            <div className="flex flex-col px-5 gap-1">
              {(['phase', 'decade', 'none'] as GroupingMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => saveGrouping(mode)}
                  className="flex items-center justify-between px-4 py-3.5 rounded-[14px] active:bg-gray-50 transition-colors"
                  style={{ background: groupingMode === mode ? '#F2F2F7' : 'transparent' }}
                >
                  <span className="font-sans text-[16px] text-gray-900">{GROUPING_LABELS[mode]}</span>
                  {groupingMode === mode && <span className="text-[18px]">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Content ──────────────────────────────────────────────────── */}
      {error && <p className="px-4 text-sm text-red-500 font-sans">{error}</p>}

      {loading ? <TimelineSkeleton /> : (
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
                    onClick={(m) => router.push(`/memories/${m.id}`)}
                    onLongPress={readOnly ? () => {} : setEditing}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Zeitgeschehen link at bottom of timeline */}
      {!loading && phases.length > 0 && (
        <div className="py-5 text-center">
          <Link
            href="/eingabe"
            className="font-sans text-[13px] active:opacity-60"
            style={{ color: '#707070' }}
          >
            🔄 Zeitgeschehen für alle Einträge ergänzen
          </Link>
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
    </main>
  )
}
