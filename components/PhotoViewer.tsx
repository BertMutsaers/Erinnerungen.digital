'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { MediaItem } from '@/hooks/useMedia'

interface Props {
  photos:       MediaItem[]   // only foto items, already filtered
  initialIndex: number
  onClose:      () => void
}

export default function PhotoViewer({ photos, initialIndex, onClose }: Props) {
  const [index,   setIndex]   = useState(initialIndex)
  const [visible, setVisible] = useState(false)

  // Touch tracking
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  useEffect(() => {
    // Fade in
    const t = requestAnimationFrame(() => setVisible(true))
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(t)
      document.body.style.overflow = ''
    }
  }, [])

  // Keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'Escape')     close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const photo = photos[index]
  if (!photo) return null

  function prev() { setIndex((i) => Math.max(0, i - 1)) }
  function next() { setIndex((i) => Math.min(photos.length - 1, i + 1)) }

  function close() {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function onTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current

    // Swipe down to close
    if (dy > 80 && Math.abs(dy) > Math.abs(dx)) { close(); return }
    // Horizontal swipe
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next(); else prev()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col"
      style={{
        backgroundColor: '#000',
        opacity:         visible ? 1 : 0,
        transition:      'opacity 200ms ease',
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-12 pb-3 flex-shrink-0 z-10">
        <button
          onClick={close}
          className="text-white font-sans text-[22px] leading-none active:opacity-60"
          aria-label="Schließen"
        >
          ✕
        </button>
        <span className="font-sans text-[13px] text-white/70 tabular-nums">
          {index + 1} / {photos.length}
        </span>
      </div>

      {/* ── Photo ───────────────────────────────────────────────── */}
      <div
        className="relative flex-1 flex items-center justify-center"
        onClick={close}    // tap background to close
      >
        {/* Stop propagation on the image so tapping it doesn't close */}
        <div
          className="relative w-full h-full"
          onClick={(e) => e.stopPropagation()}
        >
          <Image
            key={photo.id}
            src={photo.url}
            alt={photo.titel ?? ''}
            fill
            className="object-contain"
            sizes="100vw"
            unoptimized
            priority
          />
        </div>

        {/* ← Prev arrow */}
        {index > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); prev() }}
            className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full font-sans text-white"
            style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.18)', fontSize: 22 }}
            aria-label="Vorheriges Foto"
          >
            ‹
          </button>
        )}

        {/* → Next arrow */}
        {index < photos.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); next() }}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full font-sans text-white"
            style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.18)', fontSize: 22 }}
            aria-label="Nächstes Foto"
          >
            ›
          </button>
        )}
      </div>

      {/* ── Info bar ────────────────────────────────────────────── */}
      {(photo.titel || photo.beschreibung || photo.datumText || photo.datumJahr) && (
        <div
          className="flex-shrink-0 px-5 pt-12 pb-8"
          style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.75))' }}
        >
          {photo.titel && (
            <p className="font-serif font-bold text-white mb-1" style={{ fontSize: 16 }}>
              {photo.titel}
            </p>
          )}
          {photo.beschreibung && (
            <p className="font-sans line-clamp-3 mb-1.5" style={{ fontSize: 14, color: 'rgba(255,255,255,0.82)', lineHeight: 1.55 }}>
              {photo.beschreibung}
            </p>
          )}
          {(photo.datumText || photo.datumJahr) && (
            <p className="font-sans" style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
              {photo.datumText ?? photo.datumJahr}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
