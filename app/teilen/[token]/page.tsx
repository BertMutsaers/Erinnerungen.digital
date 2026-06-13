'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { usePublicProject, usePublicMemories, projectYears } from '@/hooks/usePublicData'
import PolaroidIntro from '@/components/PolaroidIntro'
import MemoryCard from '@/components/MemoryCard'
import PublicBottomNav from '@/components/PublicBottomNav'
import NavSpacer from '@/components/NavSpacer'
import ShareBanner from '@/components/ShareBanner'
import InvalidShareLink from '@/components/InvalidShareLink'

export default function PublicZeitstrahlPage() {
  const { token }  = useParams<{ token: string }>()
  const router      = useRouter()
  const searchParams = useSearchParams()
  const fromGalerie  = searchParams.get('ref') === 'galerie'
  const project    = usePublicProject(token)
  const { memories, loading } = usePublicMemories(token)

  if (project === 'not-found') return <InvalidShareLink />
  if (project === null) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F2F2F7' }}>
      <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
    </div>
  )

  const sorted = [...memories].sort((a, b) =>
    ((a.datumJahr ?? 9999) - (b.datumJahr ?? 9999)) ||
    ((a.datumMonat ?? 0)   - (b.datumMonat ?? 0)),
  )

  return (
    <div style={{ backgroundColor: '#F2F2F7', minHeight: '100vh' }}>
      {/* Polaroid intro */}
      <PolaroidIntro
        coverUrl={project.cover_url ?? undefined}
        name={project.titel}
        years={projectYears(project)}
        bookId=""
        readOnly
        onUploaded={() => {}}
        onRemoved={() => {}}
        onToast={() => {}}
      />

      {/* Memory timeline */}
      <main className="mx-auto w-full max-w-[430px] px-4 pt-6 pb-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-[11px]">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="col-span-2 bg-gray-200 animate-pulse rounded-[var(--card-radius)]" style={{ height: 160 }} />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <p className="font-sans text-center text-gray-400 py-16 text-[15px]">Noch keine Ereignisse vorhanden.</p>
        ) : (
          <div className="grid grid-cols-2 gap-[11px]">
            {sorted.map((memory) => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                onClick={(m) => router.push(`/teilen/${token}/ereignis/${m.id}`)}
                onLongPress={() => {}} // no edit in public view
              />
            ))}
          </div>
        )}
        <ShareBanner />
      </main>

      <NavSpacer />
      <PublicBottomNav token={token} showGalerieTab={fromGalerie} />
    </div>
  )
}
