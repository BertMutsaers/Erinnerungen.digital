'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { usePublicStories } from '@/hooks/usePublicData'
import { formatStoryDate } from '@/hooks/useStories'
import NavSpacer from '@/components/NavSpacer'
import InvalidShareLink from '@/components/InvalidShareLink'

export default function PublicStoryDetailPage() {
  const { token, id } = useParams<{ token: string; id: string }>()
  const router        = useRouter()
  const { stories, loading } = usePublicStories(token)

  if (!loading && stories.length === 0) return <InvalidShareLink />

  const story = stories.find((s) => s.id === id)
  const idx   = stories.findIndex((s) => s.id === id)
  const prev  = idx > 0              ? stories[idx - 1] : null
  const next  = idx < stories.length - 1 ? stories[idx + 1] : null

  const base = `/teilen/${token}`

  return (
    <main className="mx-auto w-full max-w-[430px] min-h-screen bg-[#F2F2F7]" style={{ animation: 'pageFadeIn 200ms ease forwards' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[#F2F2F7]" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <button onClick={() => router.push(`${base}/geschichten`)} className="flex items-center gap-1.5 font-sans text-[15px] text-gray-900 active:opacity-60">
          <span className="text-[20px] leading-none">‹</span>
          <span>Geschichten</span>
        </button>
      </header>

      {loading ? (
        <div className="animate-pulse px-6 pt-6 flex flex-col gap-3">
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-32" />
        </div>
      ) : !story ? (
        <div className="px-6 py-12 text-center font-sans text-gray-400">Geschichte nicht gefunden.</div>
      ) : (
        <>
          {story.fotoUrl && (
            <div className="relative w-full" style={{ height: 280 }}>
              <Image src={story.fotoUrl} alt={story.titel} fill className="object-cover object-center" sizes="430px" unoptimized priority />
              <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ height: 80, background: 'linear-gradient(to bottom, transparent, #F2F2F7)' }} />
            </div>
          )}
          <div className="px-6" style={{ paddingTop: story.fotoUrl ? 8 : 24 }}>
            {story.tag && (
              <span className="inline-block font-sans text-[11px] font-semibold text-white px-3 py-1 rounded-full mb-3" style={{ backgroundColor: '#111' }}>{story.tag}</span>
            )}
            <h1 className="font-serif font-bold text-gray-900" style={{ fontSize: 32, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{story.titel}</h1>
            {(story.erzaehler || story.createdAt) && (
              <p className="font-sans mt-2 mb-5" style={{ fontSize: 14, color: '#9B9B9B' }}>
                {[story.erzaehler, formatStoryDate(story.createdAt)].filter(Boolean).join(' · ')}
              </p>
            )}
            <div style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.08)', marginBottom: 20 }} />
            {story.inhalt ? (
              <div style={{ fontSize: 17, lineHeight: 1.75, color: '#3C3C3E' }}>
                {story.inhalt.split('\n\n').map((para, i) => (
                  <p key={i} style={{ marginBottom: 16 }}>{para}</p>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 17, color: '#C0C0C0', fontStyle: 'italic' }}>Noch kein Text vorhanden.</p>
            )}

            {/* Prev / Next — replace so history stays flat */}
            {(prev || next) && (
              <div className="flex gap-3 mt-8">
                {prev ? (
                  <Link
                    href={`${base}/geschichte/${prev.id}`}
                    replace
                    className="flex-1 rounded-[14px] bg-white active:opacity-70" style={{ padding: '14px 16px' }}>
                    <p className="font-sans text-[11px] text-gray-400 mb-1">← Vorige</p>
                    <p className="font-serif font-bold text-[15px] text-gray-900 line-clamp-2">{prev.titel}</p>
                  </Link>
                ) : <div className="flex-1" />}
                {next ? (
                  <Link
                    href={`${base}/geschichte/${next.id}`}
                    replace
                    className="flex-1 rounded-[14px] bg-white active:opacity-70 text-right" style={{ padding: '14px 16px' }}>
                    <p className="font-sans text-[11px] text-gray-400 mb-1">Nächste →</p>
                    <p className="font-serif font-bold text-[15px] text-gray-900 line-clamp-2">{next.titel}</p>
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
