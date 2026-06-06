'use client'

import { useState } from 'react'
import { Memory } from '@/lib/types'
import { groupByPhase, FILTER_CHIPS } from '@/lib/phases'
import MemoryCard from './MemoryCard'
import BottomSheet from './BottomSheet'
import BottomNav from './BottomNav'

interface Props {
  memories: Memory[]
}

export default function Timeline({ memories }: Props) {
  const [active, setActive]   = useState<Memory | null>(null)
  const [filter, setFilter]   = useState('alle')

  const phases = groupByPhase(memories, filter)

  return (
    <>
      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-4 scrollbar-none">
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

      {/* Phases */}
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

      <BottomSheet memory={active} onClose={() => setActive(null)} />
      <BottomNav />
    </>
  )
}
