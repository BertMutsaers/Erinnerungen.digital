'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { MediaItem, formatFileSize, formatMediaDate } from '@/hooks/useMedia'
import { useLongPress } from '@/hooks/useLongPress'

interface Props {
  item:          MediaItem
  onLongPress:   (item: MediaItem) => void
  onPlayVideo?:  (item: MediaItem) => void
  onViewPhoto?:  (item: MediaItem) => void
}

// ── Shared card shell ─────────────────────────────────────────────────────
import { CARD_RADIUS as RADIUS } from '@/lib/constants'

function CardShell({
  item, pressing, handlers, children, isWide,
}: {
  item:     MediaItem
  pressing: boolean
  handlers: object
  children: React.ReactNode
  isWide:   boolean
}) {
  const colSpan    = isWide ? 'col-span-2' : 'col-span-1'
  const aspectRatio = isWide ? '16 / 9' : '1 / 1'

  return (
    <div
      {...(handlers as object)}
      className={`${colSpan} relative overflow-hidden select-none`}
      style={{
        borderRadius: RADIUS,
        aspectRatio,
        transform:  pressing ? 'scale(0.97)' : 'scale(1)',
        transition: pressing ? 'transform 200ms ease' : 'transform 150ms ease',
        backgroundColor: '#E8E4DC',
      }}
    >
      {children}
    </div>
  )
}

// ── Gradient info bar (title + date) ────────────────────────────────────
function InfoBar({ item }: { item: MediaItem }) {
  const dateStr = formatMediaDate(item)
  if (!item.titel && !dateStr) return null
  return (
    <div
      className="absolute bottom-0 inset-x-0"
      style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.65))', padding: '24px 12px 8px' }}
    >
      {item.titel && <p className="font-sans text-[13px] font-medium text-white truncate">{item.titel}</p>}
      {dateStr    && <p className="font-sans text-[11px] font-medium text-white/85 mt-0.5">{dateStr}</p>}
    </div>
  )
}

// ── Missing year badge ────────────────────────────────────────────────────
function MissingDateBadge() {
  return (
    <span
      className="absolute top-2 left-2 font-sans font-semibold text-white"
      style={{ fontSize: 10, background: '#FF3B30', padding: '3px 7px', borderRadius: 4 }}
    >
      📅 Jahr fehlt
    </span>
  )
}

// ── Audio player ──────────────────────────────────────────────────────────
function AudioCard({ item, handlers, pressing }: { item: MediaItem; handlers: object; pressing: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing,  setPlaying]  = useState(false)
  const [current,  setCurrent]  = useState(0)
  const [duration, setDuration] = useState(0)

  function toggle(e: React.MouseEvent) {
    e.stopPropagation()
    const a = audioRef.current
    if (!a) return
    if (playing) { a.pause(); setPlaying(false) }
    else         { a.play();  setPlaying(true) }
  }

  const pct = duration > 0 ? (current / duration) * 100 : 0
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  return (
    <CardShell item={item} pressing={pressing} handlers={handlers} isWide>
      <audio
        ref={audioRef}
        src={item.url}
        onTimeUpdate={() => setCurrent(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={() => setPlaying(false)}
      />
      <div className="absolute inset-0 flex flex-col justify-center gap-2 bg-white px-4 py-3">
        {/* Row 1: icon + title */}
        <div className="flex items-center gap-2">
          <span className="text-[18px] flex-shrink-0">🎵</span>
          <p className="flex-1 font-sans text-[14px] font-semibold text-gray-900 truncate">
            {item.titel ?? 'Audio'}
          </p>
        </div>
        {/* Row 2: play + progress + time */}
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={toggle}
            className="flex-shrink-0 w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center text-white active:opacity-70"
          >
            <span className="text-[15px]">{playing ? '⏸' : '▶'}</span>
          </button>
          <div className="flex-1">
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gray-900 rounded-full" style={{ width: `${pct}%`, transition: '0.2s' }} />
            </div>
          </div>
          <span className="font-sans text-[11px] text-gray-400 tabular-nums flex-shrink-0">
            {duration > 0 ? fmt(duration) : '--:--'}
          </span>
        </div>
        {/* Row 3: description (optional) */}
        {item.beschreibung && (
          <p className="font-sans text-[12px] line-clamp-2" style={{ color: '#707070', marginTop: 2 }}>
            {item.beschreibung}
          </p>
        )}
        {/* Row 4: date bottom right */}
        {item.datumText && (
          <p className="font-sans text-[11px] text-left" style={{ color: '#B0B0B0', marginTop: 'auto', paddingBottom: 2 }}>
            {item.datumText}
          </p>
        )}
      </div>
    </CardShell>
  )
}

// ── Main export ───────────────────────────────────────────────────────────
export default function MediaCard({ item, onLongPress, onPlayVideo, onViewPhoto }: Props) {
  const { handlers, pressing } = useLongPress({
    onShortPress: () => {
      if (item.typ === 'foto')     { onViewPhoto?.(item); return }
      if (item.typ === 'video')    { onPlayVideo?.(item); return }
      if (item.typ === 'dokument') { window.open(item.url, '_blank') }
    },
    onLongPress: () => onLongPress(item),
  })

  // ── Audio ────────────────────────────────────────────────────────────
  if (item.typ === 'audio') {
    return <AudioCard item={item} handlers={handlers} pressing={pressing} />
  }

  // Fixed sizes per type — only foto respects DB groesse
  const effectiveGroesse =
    item.typ === 'foto'     ? item.groesse :
    item.typ === 'dokument' ? 'normal' :   // PDF → sm
    'wide'                                  // video, audio → md

  const isWide = effectiveGroesse === 'wide'
  const isTall = effectiveGroesse === 'tall'
  const colSpan = isWide || isTall ? 'col-span-2' : 'col-span-1'
  // Fixed pixel heights: Klein & Mittel = 176px, Groß = 307px
  const height = isTall ? 307 : 176

  // ── Foto ─────────────────────────────────────────────────────────────
  if (item.typ === 'foto') {
    return (
      <div
        {...handlers}
        className={`${colSpan} relative select-none overflow-hidden`}
        style={{ height, borderRadius: RADIUS, transform: pressing ? 'scale(0.97)' : 'scale(1)', transition: pressing ? 'transform 200ms ease' : 'transform 150ms ease' }}
      >
        <Image src={item.url} alt={item.titel ?? ''} fill className="object-cover" sizes="(max-width:430px) 50vw" unoptimized />
        <InfoBar item={item} />
        {!item.datumJahr && !item.albumId && <MissingDateBadge />}
      </div>
    )
  }

  // ── Video ─────────────────────────────────────────────────────────────
  if (item.typ === 'video') {
    return (
      <div
        {...handlers}
        className={`${colSpan} relative overflow-hidden select-none`}
        style={{ height: 176, borderRadius: RADIUS, backgroundColor: '#111', transform: pressing ? 'scale(0.97)' : 'scale(1)', transition: pressing ? 'transform 200ms ease' : 'transform 150ms ease' }}
      >
        {item.thumbnailUrl && (
          <Image src={item.thumbnailUrl} alt={item.titel ?? ''} fill className="object-cover" sizes="(max-width:430px) 100vw" unoptimized />
        )}
        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="flex items-center justify-center"
            style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', fontSize: 18, paddingLeft: 3 }}
          >
            ▶
          </div>
        </div>
        <InfoBar item={item} />
        {!item.datumJahr && !item.albumId && <MissingDateBadge />}
      </div>
    )
  }

  // ── Dokument (PDF) — always sm (col-span-1, 176px) ───────────────────
  return (
    <div
      {...handlers}
      className="col-span-1 relative overflow-hidden select-none"
      style={{ height: 176, borderRadius: RADIUS, backgroundColor: '#F0EDE8', transform: pressing ? 'scale(0.97)' : 'scale(1)', transition: pressing ? 'transform 200ms ease' : 'transform 150ms ease' }}
    >
      {/* Thumbnail or icon */}
      {item.thumbnailUrl ? (
        <Image src={item.thumbnailUrl} alt={item.titel ?? 'PDF'} fill className="object-cover" sizes="(max-width:430px) 50vw" unoptimized />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-3">
          <span className="text-[32px]">📄</span>
          <p className="font-sans text-[11px] font-semibold text-gray-700 text-center line-clamp-2 leading-tight">{item.titel ?? 'Dokument'}</p>
          {item.dateigroesse && <p className="font-sans text-[10px] text-gray-400">{formatFileSize(item.dateigroesse)}</p>}
        </div>
      )}
      {/* PDF badge top-right */}
      <span className="absolute top-2 right-2 font-sans font-semibold text-white"
        style={{ fontSize: 11, background: 'rgba(0,0,0,0.6)', padding: '3px 7px', borderRadius: 4 }}>
        PDF
      </span>
      {/* Title overlay bottom-left */}
      <InfoBar item={item} />
      {!item.datumJahr && <MissingDateBadge />}
    </div>
  )
}
