'use client'

import { useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { usePublicProject, usePublicMedia, usePublicAlbums } from '@/hooks/usePublicData'
import { MediaItem } from '@/hooks/useMedia'
import MediaCard from '@/components/MediaCard'
import AlbumCard from '@/components/AlbumCard'
import VideoPlayerSheet from '@/components/VideoPlayerSheet'
import PhotoViewer from '@/components/PhotoViewer'
import PublicBottomNav from '@/components/PublicBottomNav'
import NavSpacer from '@/components/NavSpacer'
import ShareBanner from '@/components/ShareBanner'
import InvalidShareLink from '@/components/InvalidShareLink'

export default function PublicMediaPage() {
  const { token } = useParams<{ token: string }>()
  const searchParams  = useSearchParams()
  const fromGalerie   = searchParams.get('ref') === 'galerie'
  const router    = useRouter()
  const project   = usePublicProject(token)
  const { items, loading }            = usePublicMedia(token)
  const { albums, loading: aLoading } = usePublicAlbums(token)

  const [playingVideo, setPlayingVideo] = useState<MediaItem | null>(null)
  const [viewerIndex,  setViewerIndex]  = useState<number | null>(null)

  if (project === 'not-found') return <InvalidShareLink />
  if (project === null) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F2F2F7' }}>
      <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
    </div>
  )

  const photos    = items.filter((i) => i.typ === 'foto')
  const isLoading = loading || aLoading

  // Merge albums + individual media, sorted by year
  const merged = [
    ...items.map((i)  => ({ type: 'media' as const, key: i.id, jahr: i.datumJahr  ?? 9999, item: i })),
    ...albums.map((a) => ({ type: 'album' as const, key: a.id, jahr: a.datumJahr  ?? 9999, album: a })),
  ].sort((a, b) => a.jahr - b.jahr)

  return (
    <main className="mx-auto w-full max-w-[430px] min-h-screen bg-[#F2F2F7]">
      <header className="px-4 pt-10 pb-3">
        <h1 className="font-serif text-[30px] font-bold text-gray-900">{project.titel}</h1>
        <p className="font-sans text-[13px] text-gray-400 mt-0.5">Media</p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-[11px] px-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="col-span-2 bg-gray-200 animate-pulse" style={{ height: 176, borderRadius: 'var(--card-radius)' }} />
          ))}
        </div>
      ) : merged.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <p className="font-sans text-gray-400 text-[15px]">Noch keine Medien vorhanden.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-[11px] px-4">
          {merged.map((entry) =>
            entry.type === 'album' ? (
              <AlbumCard
                key={entry.key}
                album={entry.album}
                onLongPress={() => {}}
                onTap={(a) => router.push(`/teilen/${token}/album/${a.id}`)}
              />
            ) : (
              <MediaCard
                key={entry.key}
                item={entry.item}
                onLongPress={() => {}}
                onPlayVideo={setPlayingVideo}
                onViewPhoto={(tapped) => {
                  const idx = photos.findIndex((p) => p.id === tapped.id)
                  if (idx !== -1) setViewerIndex(idx)
                }}
              />
            )
          )}
        </div>
      )}

      <div className="px-4"><ShareBanner /></div>

      <VideoPlayerSheet item={playingVideo} onClose={() => setPlayingVideo(null)} />
      {viewerIndex !== null && (
        <PhotoViewer
          photos={photos}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}

      <NavSpacer />
      <PublicBottomNav token={token} showGalerieTab={fromGalerie} />
    </main>
  )
}
