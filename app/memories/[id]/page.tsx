'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { fetchMemoryById, fetchAdjacentMemories } from '@/lib/queries'
import { Memory, CardColor } from '@/lib/types'
import { resolveCardColor } from '@/lib/planGridLayout'
import EditSheet from '@/components/EditSheet'
import BottomNav from '@/components/BottomNav'
import NavSpacer from '@/components/NavSpacer'

const KATEGORIE_LABEL: Record<string, string> = {
  kindheit:    'Kindheit & Jugend',
  ausbildung:  'Ausbildung',
  militaer:    'Militär',
  wanderjahre: 'Wanderjahre',
  familie:     'Familie',
  beruf:       'Bedford',
  sonstiges:   'Geschichte',
}

const COLOR_BG: Record<CardColor, string> = {
  schwarz: '#1C1C1E',
  gold:    '#F5F0E8',
  rose:    '#FDF0F0',
  blau:    '#F0F4FF',
  weiss:   '#F2F2F7',
}

const COLOR_ACCENT: Record<CardColor, string> = {
  schwarz: '#FFFFFF',
  gold:    '#8B6914',
  rose:    '#9B4D4D',
  blau:    '#2A4080',
  weiss:   '#111111',
}

// Skeleton
function DetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="w-full bg-gray-200" style={{ height: 280 }} />
      <div className="px-6 pt-6 flex flex-col gap-3">
        <div className="h-3 bg-gray-200 rounded w-24" />
        <div className="h-8 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-32" />
      </div>
    </div>
  )
}

function MemoryDetailInner() {
  const params       = useParams<{ id: string }>()
  const id           = params.id
  const router       = useRouter()
  const searchParams = useSearchParams()
  const fromPath     = searchParams.get('from') ? decodeURIComponent(searchParams.get('from')!) : null
  const basePath     = fromPath ? fromPath.replace('/zeitstrahl', '') : ''

  const [memory,   setMemory]   = useState<Memory | null>(null)
  const [adjacent, setAdjacent] = useState<{ prev: Memory | null; next: Memory | null }>({ prev: null, next: null })
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [mem, adj] = await Promise.all([
      fetchMemoryById(id),
      fetchAdjacentMemories(id),
    ])
    setMemory(mem)
    setAdjacent(adj)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const cardColor: CardColor = memory?.cardColor ?? resolveCardColor(memory?.title, memory?.body)
  const accentBg  = COLOR_BG[cardColor]
  const accentTxt = COLOR_ACCENT[cardColor]
  const isBlack   = cardColor === 'schwarz'
  const hasPhoto  = !!memory?.imageUrl
  const hasTopArea = hasPhoto || cardColor !== 'weiss'

  return (
    <main
      className="mx-auto w-full max-w-[430px] min-h-screen"
      style={{ backgroundColor: '#F2F2F7', animation: 'pageFadeIn 200ms ease forwards' }}
    >
      {/* ── Sticky header ─────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: '#F2F2F7', borderBottom: '1px solid rgba(0,0,0,0.06)' }}
      >
        <button
          onClick={() => fromPath ? router.replace(fromPath) : router.back()}
          className="flex items-center gap-1.5 font-sans text-[15px] text-gray-900 active:opacity-60"
        >
          <span className="text-[20px] leading-none">‹</span>
          <span>Zurück</span>
        </button>

        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 font-sans text-[15px] text-gray-600 active:opacity-60"
        >
          <span>Bearbeiten</span>
          <span className="text-[16px]">✏️</span>
        </button>
      </header>

      {loading ? <DetailSkeleton /> : memory ? (
        <>
          {/* ── Top area: photo or color strip ──────────────────── */}
          {hasTopArea && (
            <div className="relative w-full" style={{ height: 280 }}>
              {hasPhoto ? (
                <>
                  <Image
                    src={memory.imageUrl!}
                    alt={memory.title ?? ''}
                    fill
                    className="object-cover object-center"
                    sizes="430px"
                    unoptimized
                    priority
                  />
                  {isBlack && (
                    <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} />
                  )}
                </>
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ backgroundColor: accentBg }}
                >
                  {memory.icon && (
                    <span className="text-[72px] opacity-40">{memory.icon}</span>
                  )}
                </div>
              )}
              {/* Fade to page bg */}
              <div
                className="absolute inset-x-0 bottom-0 pointer-events-none"
                style={{ height: 80, background: 'linear-gradient(to bottom, transparent, #F2F2F7)' }}
              />
            </div>
          )}

          {/* ── Content ─────────────────────────────────────────── */}
          <div className="px-6" style={{ paddingTop: hasTopArea ? 8 : 24 }}>

            {/* Category */}
            {memory.kategorie && (
              <p
                className="font-sans text-[10px] uppercase tracking-widest mb-2"
                style={{ color: '#9B9B9B' }}
              >
                {KATEGORIE_LABEL[memory.kategorie] ?? memory.kategorie}
              </p>
            )}

            {/* Title */}
            <h1
              className="font-serif font-bold leading-[1.1]"
              style={{ fontSize: 32, letterSpacing: '-0.03em', color: '#111111' }}
            >
              {memory.title ?? '—'}
            </h1>

            {/* Date */}
            {memory.datumLabel && (
              <p className="font-sans mt-1.5 mb-6" style={{ fontSize: 14, color: '#9B9B9B' }}>
                {memory.datumLabel}
              </p>
            )}

            {/* Divider */}
            <div style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.08)', marginBottom: 20 }} />

            {/* Body text */}
            {memory.body ? (
              <div style={{ fontSize: 17, lineHeight: 1.75, color: '#3C3C3E' }}>
                {memory.body.split('\n').map((para, i) => (
                  <p key={i} style={{ marginBottom: 16 }}>{para}</p>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 17, color: '#C0C0C0', fontStyle: 'italic' }}>
                Noch keine Beschreibung vorhanden.
              </p>
            )}

            {/* Zeitgeschehen box */}
            {memory.bodyExtra?.trim() && (
              <div
                className="mt-7 rounded-[14px]"
                style={{ backgroundColor: '#F5F5F5', padding: '16px 18px' }}
              >
                <p
                  className="font-sans text-[10px] uppercase tracking-widest mb-2"
                  style={{ color: '#9B9B9B' }}
                >
                  🌍 Zeitgeschehen
                </p>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: '#3C3C3E' }}>
                  {memory.bodyExtra}
                </p>
              </div>
            )}

            {/* Prev / Next navigation */}
            {(adjacent.prev || adjacent.next) && (
              <div className="flex gap-3 mt-8 mb-20">
                {adjacent.prev ? (
                  <Link
                    href={`/memories/${adjacent.prev.id}${fromPath ? `?from=${encodeURIComponent(fromPath)}` : ''}`}
                    replace
                    className="flex-1 rounded-[14px] bg-white active:opacity-70"
                    style={{ padding: '14px 16px' }}
                  >
                    <p className="font-sans text-[11px] text-gray-400 mb-1">← Vorige</p>
                    <p className="font-serif font-bold text-[15px] text-gray-900 line-clamp-2">
                      {adjacent.prev.title}
                    </p>
                  </Link>
                ) : <div className="flex-1" />}

                {adjacent.next ? (
                  <Link
                    href={`/memories/${adjacent.next.id}${fromPath ? `?from=${encodeURIComponent(fromPath)}` : ''}`}
                    replace
                    className="flex-1 rounded-[14px] bg-white active:opacity-70 text-right"
                    style={{ padding: '14px 16px' }}
                  >
                    <p className="font-sans text-[11px] text-gray-400 mb-1">Nächste →</p>
                    <p className="font-serif font-bold text-[15px] text-gray-900 line-clamp-2">
                      {adjacent.next.title}
                    </p>
                  </Link>
                ) : <div className="flex-1" />}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="px-6 py-12 text-center font-sans text-gray-400">
          Erinnerung nicht gefunden.
        </div>
      )}

      {/* Edit Sheet */}
      <EditSheet
        memory={editing ? memory : null}
        onClose={() => setEditing(false)}
        onSaved={() => { setEditing(false); load() }}
        onDeleted={() => router.replace('/')}
      />

      <NavSpacer />
      <BottomNav basePath={basePath} zeitstrahlSuffix={basePath ? '/zeitstrahl' : ''} />
    </main>
  )
}


export default function MemoryDetailPage() {
  return (
    <Suspense fallback={null}>
      <MemoryDetailInner />
    </Suspense>
  )
}
