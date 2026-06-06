'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { Memory } from '@/lib/types'

interface Props {
  memory: Memory | null
  onClose: () => void
}

const KATEGORIE_LABEL: Record<string, string> = {
  kindheit: 'Kindheit',
  ausbildung: 'Ausbildung',
  militaer: 'Militär',
  wanderjahre: 'Wanderjahre',
  familie: 'Familie',
  beruf: 'Beruf',
  sonstiges: 'Sonstiges',
}

export default function BottomSheet({ memory, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Lock body scroll while open
  useEffect(() => {
    if (memory) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [memory])

  if (!memory) return null

  const isBlack = memory.cardSize === 'lg-black'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[430px] rounded-t-3xl bg-white overflow-hidden shadow-2xl">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Photo */}
        {memory.imageUrl && (
          <div className="relative w-full h-52">
            <Image
              src={memory.imageUrl}
              alt={memory.title ?? ''}
              fill
              className="object-cover"
              sizes="430px"
            />
          </div>
        )}

        {/* Content */}
        <div className={`px-5 pt-4 pb-10 ${isBlack ? 'bg-gray-900' : 'bg-white'}`}>
          {/* Category chip */}
          {memory.kategorie && (
            <span className="inline-block text-[10px] uppercase tracking-widest font-sans text-gray-400 mb-2">
              {KATEGORIE_LABEL[memory.kategorie] ?? memory.kategorie}
            </span>
          )}

          <div className="flex items-start gap-3 mb-3">
            {memory.icon && (
              <span className="text-3xl leading-none flex-shrink-0">{memory.icon}</span>
            )}
            <h2 className={`font-serif text-2xl font-bold leading-tight ${isBlack ? 'text-white' : 'text-gray-900'}`}>
              {memory.title}
            </h2>
          </div>

          {memory.datumLabel && (
            <p className="text-sm font-sans text-gray-400 mb-3 tabular-nums">
              {memory.datumLabel}
            </p>
          )}

          {memory.body && (
            <p className={`font-sans text-sm leading-relaxed ${isBlack ? 'text-gray-300' : 'text-gray-600'}`}>
              {memory.body}
            </p>
          )}

          {memory.location && (
            <p className="mt-3 text-xs text-gray-400 font-sans">
              📍 {memory.location}
            </p>
          )}
        </div>
      </div>
    </>
  )
}
