'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMemories } from '@/hooks/useMemories'
import { usePerson } from '@/hooks/usePerson'
import { FILTER_CHIPS } from '@/lib/phases'
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

const BOOK_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

export default function TimelineScreen() {
  const router = useRouter()
  const [filter, setFilter]   = useState('alle')
  const [editing, setEditing] = useState<Memory | null>(null)
  const [toast,   setToast]   = useState<string | null>(null)
  // localCoverUrl is lifted up so PolaroidIntro can update it
  const [localCoverUrl, setLocalCoverUrl] = useState<string | null>(null)
  const [newMemoryOpen, setNewMemoryOpen] = useState(false)

  const { person, reload: reloadPerson } = usePerson(BOOK_ID)
  const { phases, loading, error, reload } = useMemories(BOOK_ID, filter)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <main className="mx-auto w-full max-w-[430px] min-h-screen bg-[#F2F2F7]">

      {/* ── Polaroid intro (with built-in upload) ───────────────────── */}
      <PolaroidIntro
        coverUrl={localCoverUrl ?? person?.coverUrl}
        name={person?.title ?? 'Piet Mutsaers'}
        years="1926 – 1982"
        bookId={BOOK_ID}
        onUploaded={(url) => { setLocalCoverUrl(url); reloadPerson() }}
        onRemoved={() => { setLocalCoverUrl(null); reloadPerson() }}
        onToast={showToast}
      />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="px-4 pt-10 pb-3">
        <h1 className="font-serif text-[30px] font-bold leading-tight text-gray-900">
          {person?.title ?? 'Piet Mutsaers'}
        </h1>
        <p className="font-sans text-[13px] text-gray-400 mt-0.5">
          1926 – 1982 · Osnabrück
        </p>
      </header>

      {/* ── Filter chips ─────────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {FILTER_CHIPS.map((chip) => {
          const selected = filter === chip.key
          return (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-sans font-medium transition-colors
                ${selected ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
            >
              {chip.label}
            </button>
          )
        })}
      </div>

      {/* ── Content ──────────────────────────────────────────────────── */}
      {error && <p className="px-4 text-sm text-red-500 font-sans">{error}</p>}

      {loading ? <TimelineSkeleton /> : (
        <div className="flex flex-col gap-8 px-4">
          {phases.map((phase) => (
            <section key={phase.key}>
              <p className="text-[11px] uppercase tracking-widest font-sans text-gray-400 mb-3">
                {phase.label}
              </p>
              <div className="grid grid-cols-2 gap-3" id={`section-${phase.key}`} data-phase-key={phase.key}>
                {phase.memories.map((mem) => (
                  <MemoryCard
                    key={mem.id}
                    memory={mem}
                    onClick={(m) => router.push(`/memories/${m.id}`)}
                    onLongPress={setEditing}
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

      {/* Floating ⊕ button */}
      <button
        onClick={() => setNewMemoryOpen(true)}
        className="fixed z-30 flex items-center justify-center rounded-full bg-gray-900 text-white active:opacity-80"
        style={{ bottom: 90, right: 20, width: 48, height: 48, fontSize: 24, lineHeight: 1, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
        aria-label="Neue Erinnerung"
      >
        ⊕
      </button>

      <ScrollIndicator phases={phases.map((p) => ({ key: p.key, label: p.label }))} />

      <NewMemorySheet
        open={newMemoryOpen}
        onClose={() => setNewMemoryOpen(false)}
        onSaved={() => { reload(); showToast('✓ Gespeichert') }}
      />

      <EditSheet
        memory={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { reload(); showToast('✓ Gespeichert') }}
        onDeleted={() => { reload(); showToast('Erinnerung gelöscht') }}
      />

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[70]
          bg-gray-900 text-white text-[13px] font-sans px-5 py-2.5
          rounded-full shadow-lg whitespace-nowrap animate-fade-in">
          {toast}
        </div>
      )}

      <NavSpacer />
      <BottomNav />
    </main>
  )
}
