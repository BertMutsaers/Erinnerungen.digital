'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { usePublicMemories } from '@/hooks/usePublicData'
import NavSpacer from '@/components/NavSpacer'
import InvalidShareLink from '@/components/InvalidShareLink'

const KATEGORIE_LABEL: Record<string, string> = {
  kindheit: 'Kindheit & Jugend', ausbildung: 'Ausbildung', militaer: 'Militär',
  wanderjahre: 'Wanderjahre', familie: 'Familie', beruf: 'Beruf', sonstiges: 'Geschichte',
}

export default function PublicMemoryDetailPage() {
  const { token, id } = useParams<{ token: string; id: string }>()
  const router        = useRouter()
  const { memories, loading } = usePublicMemories(token)

  if (!loading && memories.length === 0) return <InvalidShareLink />

  const sorted = [...memories].sort((a, b) =>
    ((a.datumJahr ?? 9999) - (b.datumJahr ?? 9999)) ||
    ((a.datumMonat ?? 0)   - (b.datumMonat ?? 0)),
  )
  const memory = sorted.find((m) => m.id === id)
  const idx    = sorted.findIndex((m) => m.id === id)
  const prev   = idx > 0             ? sorted[idx - 1] : null
  const next   = idx < sorted.length - 1 ? sorted[idx + 1] : null

  const base = `/teilen/${token}`

  return (
    <main className="mx-auto w-full max-w-[430px] min-h-screen bg-[#F2F2F7]" style={{ animation: 'pageFadeIn 200ms ease forwards' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[#F2F2F7]" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <button onClick={() => router.replace(base)} className="flex items-center gap-1.5 font-sans text-[15px] text-gray-900 active:opacity-60">
          <span className="text-[20px] leading-none">‹</span>
          <span>Zeitstrahl</span>
        </button>
      </header>

      {loading ? (
        <div className="animate-pulse">
          <div className="w-full bg-gray-200" style={{ height: 280 }} />
          <div className="px-6 pt-6 flex flex-col gap-3">
            <div className="h-3 bg-gray-200 rounded w-24" />
            <div className="h-8 bg-gray-200 rounded w-3/4" />
          </div>
        </div>
      ) : !memory ? (
        <div className="px-6 py-12 text-center font-sans text-gray-400">Ereignis nicht gefunden.</div>
      ) : (
        <>
          {memory.imageUrl && (
            <div className="relative w-full" style={{ height: 280 }}>
              <Image src={memory.imageUrl} alt={memory.title ?? ''} fill className="object-cover object-center" sizes="430px" unoptimized priority />
              <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ height: 80, background: 'linear-gradient(to bottom, transparent, #F2F2F7)' }} />
            </div>
          )}
          <div className="px-6" style={{ paddingTop: memory.imageUrl ? 8 : 24 }}>
            {memory.kategorie && (
              <p className="font-sans text-[10px] uppercase tracking-widest mb-2" style={{ color: '#9B9B9B' }}>
                {KATEGORIE_LABEL[memory.kategorie] ?? memory.kategorie}
              </p>
            )}
            <h1 className="font-serif font-bold leading-[1.1]" style={{ fontSize: 32, letterSpacing: '-0.03em', color: '#111111' }}>
              {memory.title ?? '—'}
            </h1>
            {memory.datumLabel && (
              <p className="font-sans mt-1.5 mb-6" style={{ fontSize: 14, color: '#9B9B9B' }}>{memory.datumLabel}</p>
            )}
            <div style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.08)', marginBottom: 20 }} />
            {memory.body ? (
              <div style={{ fontSize: 17, lineHeight: 1.75, color: '#3C3C3E' }}>
                {memory.body.split('\n').map((para, i) => (
                  <p key={i} style={{ marginBottom: 16 }}>{para}</p>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 17, color: '#C0C0C0', fontStyle: 'italic' }}>Noch keine Beschreibung vorhanden.</p>
            )}
            {memory.bodyExtra?.trim() && (
              <div className="mt-7 rounded-[14px]" style={{ backgroundColor: '#F5F5F5', padding: '16px 18px' }}>
                <p className="font-sans text-[10px] uppercase tracking-widest mb-2" style={{ color: '#9B9B9B' }}>🌍 Zeitgeschehen</p>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: '#3C3C3E' }}>{memory.bodyExtra}</p>
              </div>
            )}

            {/* Prev / Next */}
            {(prev || next) && (
              <div className="flex gap-3 mt-8 mb-20">
                {prev ? (
                  <Link href={`${base}/ereignis/${prev.id}`} replace className="flex-1 rounded-[14px] bg-white active:opacity-70" style={{ padding: '14px 16px' }}>
                    <p className="font-sans text-[11px] text-gray-400 mb-1">← Vorige</p>
                    <p className="font-serif font-bold text-[15px] text-gray-900 line-clamp-2">{prev.title}</p>
                  </Link>
                ) : <div className="flex-1" />}
                {next ? (
                  <Link href={`${base}/ereignis/${next.id}`} replace className="flex-1 rounded-[14px] bg-white active:opacity-70 text-right" style={{ padding: '14px 16px' }}>
                    <p className="font-sans text-[11px] text-gray-400 mb-1">Nächste →</p>
                    <p className="font-serif font-bold text-[15px] text-gray-900 line-clamp-2">{next.title}</p>
                  </Link>
                ) : <div className="flex-1" />}
              </div>
            )}
          </div>
        </>
      )}
      <NavSpacer />
    </main>
  )
}
