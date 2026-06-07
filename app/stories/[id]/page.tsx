'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Story, formatStoryDate } from '@/hooks/useStories'
import StoryEditSheet from '@/components/StoryEditSheet'
import BottomNav from '@/components/BottomNav'
import NavSpacer from '@/components/NavSpacer'

const BOOK_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

interface Adjacent { prev: Story | null; next: Story | null }

function StorySkeleton() {
  return (
    <div className="animate-pulse">
      <div className="w-full bg-gray-200" style={{ height: 280 }} />
      <div className="px-6 pt-6 flex flex-col gap-3">
        <div className="h-3 bg-gray-200 rounded w-16" />
        <div className="h-8 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-40" />
      </div>
    </div>
  )
}

export default function StoryDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()

  const [story,    setStory]    = useState<Story | null>(null)
  const [adjacent, setAdjacent] = useState<Adjacent>({ prev: null, next: null })
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: s }, { data: all }] = await Promise.all([
      supabase.from('stories').select('*').eq('id', id).single(),
      supabase.from('stories').select('id, titel, sort_order').eq('book_id', BOOK_ID).order('sort_order', { ascending: true }),
    ])
    if (s) setStory({ id: s.id, titel: s.titel, inhalt: s.inhalt ?? undefined, tag: s.tag ?? undefined, erzaehler: s.erzaehler ?? undefined, fotoUrl: s.foto_url ?? undefined, sortOrder: s.sort_order ?? 0, createdAt: s.created_at ?? undefined })
    if (all) {
      const idx = all.findIndex((r) => r.id === id)
      setAdjacent({
        prev: idx > 0           ? { id: all[idx-1].id, titel: all[idx-1].titel, sortOrder: all[idx-1].sort_order } : null,
        next: idx < all.length-1 ? { id: all[idx+1].id, titel: all[idx+1].titel, sortOrder: all[idx+1].sort_order } : null,
      })
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  return (
    <main className="mx-auto w-full max-w-[430px] min-h-screen bg-[#F2F2F7]" style={{ animation: 'pageFadeIn 200ms ease forwards' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[#F2F2F7]" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <button onClick={() => router.push('/geschichten')} className="flex items-center gap-1.5 font-sans text-[15px] text-gray-900 active:opacity-60">
          <span className="text-[20px] leading-none">‹</span>
          <span>Zurück</span>
        </button>
        <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 font-sans text-[15px] text-gray-600 active:opacity-60">
          <span>Bearbeiten</span><span className="text-[16px]">✏️</span>
        </button>
      </header>

      {loading ? <StorySkeleton /> : story ? (
        <>
          {/* Photo */}
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

            {/* Prev / Next */}
            {(adjacent.prev || adjacent.next) && (
              <div className="flex gap-3 mt-8">
                {adjacent.prev ? (
                  <Link href={`/stories/${adjacent.prev.id}`} className="flex-1 rounded-[14px] bg-white active:opacity-70" style={{ padding: '14px 16px' }}>
                    <p className="font-sans text-[11px] text-gray-400 mb-1">← Vorige</p>
                    <p className="font-serif font-bold text-[15px] text-gray-900 line-clamp-2">{adjacent.prev.titel}</p>
                  </Link>
                ) : <div className="flex-1" />}
                {adjacent.next ? (
                  <Link href={`/stories/${adjacent.next.id}`} className="flex-1 rounded-[14px] bg-white active:opacity-70 text-right" style={{ padding: '14px 16px' }}>
                    <p className="font-sans text-[11px] text-gray-400 mb-1">Nächste →</p>
                    <p className="font-serif font-bold text-[15px] text-gray-900 line-clamp-2">{adjacent.next.titel}</p>
                  </Link>
                ) : <div className="flex-1" />}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="px-6 py-12 text-center font-sans text-gray-400">Geschichte nicht gefunden.</div>
      )}

      <StoryEditSheet
        open={editing}
        story={story}
        onClose={() => setEditing(false)}
        onSaved={() => { setEditing(false); load() }}
        onDeleted={() => router.replace('/geschichten')}
      />

      <NavSpacer />
      <BottomNav />
    </main>
  )
}
