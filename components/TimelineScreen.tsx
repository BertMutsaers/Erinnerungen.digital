'use client'

import { useState } from 'react'
import { useMemories } from '@/hooks/useMemories'
import { usePerson } from '@/hooks/usePerson'
import { FILTER_CHIPS } from '@/lib/phases'
import { Memory } from '@/lib/types'
import MemoryCard from './MemoryCard'
import BottomSheet from './BottomSheet'
import BottomNav from './BottomNav'
import { TimelineSkeleton } from './MemoryCardSkeleton'

const BOOK_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

export default function TimelineScreen() {
  const [filter, setFilter] = useState('alle')
  const [active, setActive] = useState<Memory | null>(null)

  const { person }                    = usePerson(BOOK_ID)
  const { phases, loading, error }    = useMemories(BOOK_ID, filter)

  return (
    <main className="mx-auto w-full max-w-[430px] min-h-screen bg-[#F2F2F7]">
      {/* Header */}
      <header className="px-4 pt-10 pb-3">
        <h1 className="font-serif text-[30px] font-bold leading-tight text-gray-900">
          {person?.title ?? 'Piet Mutsaers'}
        </h1>
        <p className="font-sans text-[13px] text-gray-400 mt-0.5">
          1926 – 1982 · Osnabrück
        </p>
      </header>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {FILTER_CHIPS.map((chip) => {
          const selected = filter === chip.key
          return (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-sans font-medium transition-colors
                ${selected
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-500 border border-gray-200'
                }`}
            >
              {chip.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {error && (
        <p className="px-4 text-sm text-red-500 font-sans">{error}</p>
      )}

      {loading ? (
        <TimelineSkeleton />
      ) : (
        <div className="flex flex-col gap-8 px-4 pb-32">
          {phases.map((phase) => (
            <section key={phase.key}>
              <p className="text-[11px] uppercase tracking-widest font-sans text-gray-400 mb-3">
                {phase.label}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {phase.memories.map((mem) => (
                  <MemoryCard key={mem.id} memory={mem} onClick={setActive} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <BottomSheet memory={active} onClose={() => setActive(null)} />
      <BottomNav />
    </main>
  )
}
