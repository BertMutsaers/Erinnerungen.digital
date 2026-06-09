'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { resizeImage } from '@/lib/resizeImage'
import { parseDateText } from '@/lib/parseDate'
import { Album } from '@/hooks/useAlbums'
import { MediaItem } from '@/hooks/useMedia'
import AlbumEditSheet from '@/components/AlbumEditSheet'
import AlbumPhotoEditSheet from '@/components/AlbumPhotoEditSheet'
import PhotoPickerSheet from '@/components/PhotoPickerSheet'
import PhotoViewer from '@/components/PhotoViewer'
import MediaCard from '@/components/MediaCard'
import BottomNav from '@/components/BottomNav'
import NavSpacer from '@/components/NavSpacer'

const DEMO_BOOK_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

function mapMediaRow(r: Record<string, unknown>): MediaItem {
  return {
    id:           r.id as string,
    typ:          'foto',
    url:          r.url as string,
    thumbnailUrl: undefined,
    storagePath:  (r.storage_path as string) ?? undefined,
    titel:        (r.titel as string)        ?? undefined,
    beschreibung: (r.beschreibung as string) ?? undefined,
    datumText:    (r.datum_text as string)   ?? undefined,
    datumJahr:    (r.datum_jahr as number)   ?? undefined,
    datumMonat:   (r.datum_monat as number)  ?? undefined,
    datumTag:     (r.datum_tag as number)    ?? undefined,
    albumId:      (r.album_id as string)     ?? undefined,
    groesse:      'normal',
    sortierung:   0,
    createdAt:    r.created_at as string,
  }
}

function AlbumDetailInner() {
  const { id }       = useParams<{ id: string }>()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const fromPath     = searchParams.get('from') ? decodeURIComponent(searchParams.get('from')!) : null
  const basePath     = fromPath ? fromPath.replace('/media', '') : ''
  const fileRef = useRef<HTMLInputElement>(null)

  const [album,     setAlbum]     = useState<Album | null>(null)
  const [bookId,    setBookId]     = useState(DEMO_BOOK_ID)
  const [photos,    setPhotos]    = useState<MediaItem[]>([])
  const [editing,   setEditing]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress,  setProgress]  = useState<{ done: number; total: number } | null>(null)
  const [viewerIdx,     setViewerIdx]     = useState<number | null>(null)
  const [editingPhoto,  setEditingPhoto]  = useState<MediaItem | null>(null)
  const [showAddMenu,   setShowAddMenu]   = useState(false)
  const [showPicker,    setShowPicker]    = useState(false)
  const [toast,     setToast]     = useState<string | null>(null)

  const load = useCallback(async () => {
    const [{ data: a }, { data: m }] = await Promise.all([
      supabase.from('albums').select('*').eq('id', id).single(),
      supabase.from('media').select('id, url, storage_path, titel, beschreibung, datum_text, datum_jahr, datum_monat, datum_tag, album_id, created_at')
        .eq('album_id', id)
        .order('datum_jahr',  { ascending: true, nullsFirst: false })
        .order('created_at',  { ascending: true }),
    ])
    if (a) { setBookId(a.book_id ?? DEMO_BOOK_ID); setAlbum({ id: a.id, titel: a.titel, datumText: a.datum_text ?? undefined, datumJahr: a.datum_jahr ?? undefined, datumMonat: a.datum_monat ?? undefined, datumTag: a.datum_tag ?? undefined, coverUrl: a.cover_url ?? undefined, sortierung: a.sortierung ?? 0, photoCount: 0, previewUrls: [] }) }
    if (m) setPhotos(m.map(mapMediaRow))
  }, [id])

  useEffect(() => { load() }, [load])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    setProgress({ done: 0, total: files.length })
    let firstUrl: string | null = null

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const { blob } = await resizeImage(file, { maxW: 800, maxH: 800 })
        const ts   = Date.now() + i
        const path = `${bookId}/album/${id}/${ts}-${file.name.replace(/[^a-z0-9.]/gi, '_')}`
        await supabase.storage.from('media-files').upload(path, blob, { upsert: false, contentType: 'image/jpeg' })
        const { data } = supabase.storage.from('media-files').getPublicUrl(path)
        await supabase.from('media').insert({
          book_id:     bookId,
          album_id:    id,
          typ:         'foto',
          url:         data.publicUrl,
          storage_path: path,
          titel:       file.name.replace(/\.[^.]+$/, ''),
          // Inherit album date
          datum_text:  album?.datumText  ?? null,
          datum_jahr:  album?.datumJahr  ?? null,
          datum_monat: album?.datumMonat ?? null,
          datum_tag:   album?.datumTag   ?? null,
        })
        if (!firstUrl) firstUrl = data.publicUrl
        setProgress({ done: i + 1, total: files.length })
      }
      // Update album cover if none set
      if (firstUrl && !album?.coverUrl) {
        await supabase.from('albums').update({ cover_url: firstUrl }).eq('id', id)
      }
      await load()
      showToast(`✓ ${files.length} ${files.length === 1 ? 'Foto' : 'Fotos'} hinzugefügt`)
    } catch (err) {
      showToast('Fehler: ' + String(err))
    } finally {
      setUploading(false)
      setProgress(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const displayDate = album?.datumText ?? (album?.datumJahr ? String(album.datumJahr) : '')

  return (
    <main className="mx-auto w-full max-w-[430px] min-h-screen bg-[#F2F2F7]">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[#F2F2F7]" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <button onClick={() => fromPath ? router.push(fromPath) : router.back()} className="flex items-center gap-1.5 font-sans text-[15px] text-gray-900 active:opacity-60">
          <span className="text-[20px] leading-none">‹</span>
          <span>Zurück</span>
        </button>
        <h1 className="font-serif font-bold text-[17px] text-gray-900 truncate mx-3 flex-1 text-center">{album?.titel ?? ''}</h1>
        <button onClick={() => setEditing(true)} className="font-sans text-[15px] text-gray-600 active:opacity-60">✏️</button>
      </header>

      {/* Subtitle */}
      {(displayDate || photos.length > 0) && (
        <p className="font-sans text-[13px] px-4 pt-3 pb-1" style={{ color: '#707070' }}>
          {[displayDate, `${photos.length} ${photos.length === 1 ? 'Foto' : 'Fotos'}`].filter(Boolean).join(' · ')}
        </p>
      )}

      {/* Upload progress */}
      {uploading && progress && (
        <div className="px-4 py-2">
          <p className="font-sans text-[13px] text-gray-500 mb-1">{progress.done} von {progress.total} Fotos hochgeladen …</p>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gray-900 rounded-full transition-all duration-300" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Photo grid */}
      {photos.length === 0 && !uploading ? (
        <div className="px-4 py-16 text-center">
          <p className="font-sans text-gray-400 text-[15px]">Noch keine Fotos im Album.</p>
          <p className="font-sans text-gray-400 text-[13px] mt-1">Tippe ⊕ um Fotos hinzuzufügen.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-[3px] mt-2">
          {photos.map((photo, idx) => (
            <MediaCard
              key={photo.id}
              item={photo}
              onLongPress={(p) => setEditingPhoto(p)}
              onViewPhoto={() => setViewerIdx(idx)}
            />
          ))}
        </div>
      )}

      {/* Floating add button */}
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
      <button
        onClick={() => setShowAddMenu(true)}
        disabled={uploading}
        className="fixed z-30 flex items-center justify-center rounded-full bg-gray-900 text-white shadow-lg active:opacity-80 disabled:opacity-50"
        style={{ bottom: 90, right: 20, width: 48, height: 48, fontSize: 28, lineHeight: 1, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
      >
        {uploading ? '⏳' : '⊕'}
      </button>

      {/* Add menu */}
      {showAddMenu && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={() => setShowAddMenu(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[430px] pb-4 px-4">
            <div className="bg-white rounded-[18px] overflow-hidden shadow-xl mb-3">
              <button
                onClick={() => { setShowAddMenu(false); setShowPicker(true) }}
                className="w-full px-4 py-4 text-left font-sans text-[16px] text-gray-900 flex items-center gap-3 active:bg-gray-50"
              >
                <span>🖼️</span> Fotos aus Bibliothek hinzufügen
              </button>
              <div className="h-px bg-gray-100 mx-4" />
              <button
                onClick={() => { setShowAddMenu(false); fileRef.current?.click() }}
                className="w-full px-4 py-4 text-left font-sans text-[16px] text-gray-900 flex items-center gap-3 active:bg-gray-50"
              >
                <span>📷</span> Neue Fotos hochladen
              </button>
            </div>
            <button onClick={() => setShowAddMenu(false)}
              className="w-full py-4 bg-white rounded-[18px] font-sans font-semibold text-[16px] text-gray-900 active:opacity-70">
              Abbrechen
            </button>
          </div>
        </>
      )}

      {viewerIdx !== null && (
        <PhotoViewer photos={photos} initialIndex={viewerIdx} onClose={() => setViewerIdx(null)} />
      )}

      <AlbumEditSheet
        album={editing ? album : null}
        onClose={() => setEditing(false)}
        onSaved={() => { setEditing(false); load() }}
        onDeleted={() => router.replace(fromPath ?? '/media')}
      />

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] bg-gray-900 text-white text-[13px] font-sans px-5 py-2.5 rounded-full shadow-lg whitespace-nowrap animate-fade-in">{toast}</div>
      )}

      <PhotoPickerSheet
        open={showPicker}
        albumId={id}
        bookId={bookId}
        onClose={() => setShowPicker(false)}
        onAdded={(count) => { load(); showToast(`✓ ${count} ${count === 1 ? 'Foto' : 'Fotos'} hinzugefügt`) }}
      />

      <AlbumPhotoEditSheet
        photo={editingPhoto}
        albumDate={album?.datumText ?? (album?.datumJahr ? String(album.datumJahr) : undefined)}
        onClose={() => setEditingPhoto(null)}
        onSaved={() => { setEditingPhoto(null); load() }}
        onRemoved={() => { setEditingPhoto(null); load() }}
      />

      <NavSpacer />
      <BottomNav basePath={basePath} />
    </main>
  )
}

export default function AlbumDetailPage() {
  return (
    <Suspense fallback={null}>
      <AlbumDetailInner />
    </Suspense>
  )
}
