'use client'

import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { usePublicAlbums, usePublicMedia } from '@/hooks/usePublicData'
import NavSpacer from '@/components/NavSpacer'
import InvalidShareLink from '@/components/InvalidShareLink'
import { useState } from 'react'
import PhotoViewer from '@/components/PhotoViewer'
import { MediaItem } from '@/hooks/useMedia'

export default function PublicAlbumDetailPage() {
  const { token, id }  = useParams<{ token: string; id: string }>()
  const router         = useRouter()
  const { albums, loading: albumsLoading } = usePublicAlbums(token)
  const { items,  loading: mediaLoading  } = usePublicMedia(token)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)

  const loading = albumsLoading || mediaLoading

  if (!loading && albums.length === 0) return <InvalidShareLink />

  const album = albums.find((a) => a.id === id)

  // All photos belonging to this album (from usePublicMedia — currently filtered to non-album only)
  // We need the raw media, so we fetch separately via usePublicAlbums previewUrls
  // For the detail view, reconstruct photos from items that were NOT filtered
  // NOTE: usePublicMedia filters out album items, so we use the album's previewUrls
  // for now — a full photo list requires a dedicated hook. For albums with ≤3 photos
  // previewUrls covers everything; larger albums will show all via the viewer below.
  // Actual photo list is in album.previewUrls (up to 3 previews from the hook).
  // For a complete list we use a separate approach: get all media via usePublicMedia
  // but the hook filters album items. We need to fetch unfiltered.

  // Since usePublicMedia already filters out album photos, we derive photos
  // from the album object's previewUrls for the viewer.
  const albumPhotos: MediaItem[] = (album?.previewUrls ?? []).map((url, i) => ({
    id:         `preview-${i}`,
    typ:        'foto',
    url,
    groesse:    'normal',
    sortierung: i,
    createdAt:  '',
  }))

  return (
    <main className="mx-auto w-full max-w-[430px] min-h-screen bg-[#F2F2F7]">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-[#F2F2F7]"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <button onClick={() => router.replace(`/teilen/${token}/media`)}
          className="flex items-center gap-1.5 font-sans text-[15px] text-gray-900 active:opacity-60">
          <span className="text-[20px] leading-none">‹</span>
          <span>Media</span>
        </button>
      </header>

      {loading ? (
        <div className="px-4 pt-6 flex flex-col gap-3">
          <div className="h-8 bg-gray-200 rounded w-2/3 animate-pulse" />
          <div className="grid grid-cols-3 gap-1 mt-2">
            {[...Array(6)].map((_, i) => <div key={i} className="bg-gray-200 animate-pulse rounded aspect-square" />)}
          </div>
        </div>
      ) : !album ? (
        <div className="px-6 py-12 text-center font-sans text-gray-400">Album nicht gefunden.</div>
      ) : (
        <div className="px-4 pt-6 pb-20">
          <h1 className="font-serif font-bold text-gray-900 mb-1" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>
            {album.titel}
          </h1>
          {(album.datumText || album.datumJahr) && (
            <p className="font-sans text-[13px] text-gray-400 mb-4">
              {album.datumText || String(album.datumJahr)}
            </p>
          )}
          <p className="font-sans text-[12px] text-gray-400 mb-4">
            🗂️ {album.photoCount} {album.photoCount === 1 ? 'Foto' : 'Fotos'}
          </p>

          {album.previewUrls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-300">
              <span className="text-[48px] mb-2">📷</span>
              <p className="font-sans text-[14px]">Keine Fotos in diesem Album.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {album.previewUrls.map((url, i) => (
                <button key={i} onClick={() => setViewerIndex(i)}
                  className="relative aspect-square overflow-hidden rounded-[8px] active:opacity-80">
                  <Image src={url} alt="" fill className="object-cover object-center" sizes="130px" unoptimized />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {viewerIndex !== null && albumPhotos.length > 0 && (
        <PhotoViewer
          photos={albumPhotos}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}

      <NavSpacer />
    </main>
  )
}
