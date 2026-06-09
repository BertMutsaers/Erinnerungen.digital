'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStories, Story } from '@/hooks/useStories'
import { usePerson } from '@/hooks/usePerson'
import StoryCard from './StoryCard'
import StoryEditSheet from './StoryEditSheet'
import BottomNav from './BottomNav'
import NavSpacer from './NavSpacer'

const EMPTY_STORY: Story = { id: '', titel: '', sortOrder: 0 }

interface Props { bookId: string; basePath?: string; readOnly?: boolean }

export default function GeschichtenScreen({ bookId, basePath = '', readOnly = false }: Props) {
  const router = useRouter()
  // Extract projectId from basePath (e.g. "/projekte/abc123" → "abc123")
  const projectId = basePath.split('/').filter(Boolean).pop()
  const { person }                     = usePerson(bookId)
  const { stories, loading, reload }   = useStories(bookId, projectId)
  const [editing, setEditing]          = useState<Story | null | undefined>(undefined)
  const [toast,   setToast]            = useState<string | null>(null)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  return (
    <main className="mx-auto w-full max-w-[430px] min-h-screen bg-[#F2F2F7]">
      <header className="px-4 pt-10 pb-4">
        <h1 className="font-serif text-[30px] font-bold leading-tight text-gray-900">
          {person?.title ?? ''}
        </h1>
        <p className="font-sans text-[13px] text-gray-400 mt-0.5">Geschichten</p>
      </header>

      {loading ? (
        <div className="px-4 flex flex-col gap-3">
          {[1,2,3].map((i) => <div key={i} className="w-full rounded-[18px] bg-gray-200 animate-pulse" style={{ height: 260 }} />)}
        </div>
      ) : stories.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <p className="font-sans text-gray-400 text-[15px]">Noch keine Geschichten.</p>
          <p className="font-sans text-gray-400 text-[13px] mt-1">Tippe ⊕ um die erste anzulegen.</p>
        </div>
      ) : (
        <div className="px-4 flex flex-col gap-[11px]">
          {stories.map((story) => (
            <StoryCard key={story.id} story={story}
              onClick={(s) => router.push(`/stories/${s.id}?from=${encodeURIComponent(basePath + '/geschichten')}`)}
              onLongPress={readOnly ? () => {} : (s) => setEditing(s)} />
          ))}
        </div>
      )}

      {!readOnly && (
        <>
          <button onClick={() => setEditing(EMPTY_STORY)}
            className="fixed z-30 flex items-center justify-center rounded-full bg-gray-900 text-white shadow-lg active:opacity-80"
            style={{ bottom: 84, right: 16, width: 48, height: 48, fontSize: 28, lineHeight: 1 }}>
            ⊕
          </button>
          <StoryEditSheet
            open={editing !== undefined}
            story={editing ?? null}
            bookId={bookId}
            onClose={() => setEditing(undefined)}
            onSaved={() => { reload(); showToast('✓ Gespeichert') }}
            onDeleted={() => { reload(); showToast('Geschichte gelöscht') }} />
        </>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] bg-gray-900 text-white text-[13px] font-sans px-5 py-2.5 rounded-full shadow-lg whitespace-nowrap animate-fade-in">
          {toast}
        </div>
      )}
      <NavSpacer />
      <BottomNav basePath={basePath} />
    </main>
  )
}
