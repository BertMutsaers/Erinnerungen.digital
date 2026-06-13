'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { usePublicProject, usePublicStories } from '@/hooks/usePublicData'
import StoryCard from '@/components/StoryCard'
import PublicBottomNav from '@/components/PublicBottomNav'
import NavSpacer from '@/components/NavSpacer'
import ShareBanner from '@/components/ShareBanner'
import InvalidShareLink from '@/components/InvalidShareLink'

export default function PublicGeschichtenPage() {
  const { token } = useParams<{ token: string }>()
  const searchParams  = useSearchParams()
  const fromGalerie   = searchParams.get('ref') === 'galerie'
  const router    = useRouter()
  const project   = usePublicProject(token)
  const { stories, loading } = usePublicStories(token)

  if (project === 'not-found') return <InvalidShareLink />
  if (project === null) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F2F2F7' }}>
      <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
    </div>
  )

  return (
    <main className="mx-auto w-full max-w-[430px] min-h-screen bg-[#F2F2F7]">
      <header className="px-4 pt-10 pb-4">
        <h1 className="font-serif text-[30px] font-bold leading-tight text-gray-900">{project.titel}</h1>
        <p className="font-sans text-[13px] text-gray-400 mt-0.5">Geschichten</p>
      </header>

      {loading ? (
        <div className="px-4 flex flex-col gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="w-full rounded-[18px] bg-gray-200 animate-pulse" style={{ height: 260 }} />)}
        </div>
      ) : stories.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <p className="font-sans text-gray-400 text-[15px]">Noch keine Geschichten vorhanden.</p>
        </div>
      ) : (
        <div className="px-4 flex flex-col gap-[11px]">
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              onClick={(s) => router.push(`/teilen/${token}/geschichte/${s.id}`)}
              onLongPress={() => {}} // no edit in public view
            />
          ))}
        </div>
      )}

      <div className="px-4"><ShareBanner /></div>
      <NavSpacer />
      <PublicBottomNav token={token} showGalerieTab={fromGalerie} />
    </main>
  )
}
