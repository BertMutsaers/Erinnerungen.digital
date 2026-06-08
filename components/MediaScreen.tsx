'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { usePerson } from '@/hooks/usePerson'
import { useMedia, MediaItem, MediaType, getYouTubeThumbnail, fetchVimeoThumbnail, getVimeoId } from '@/hooks/useMedia'
import { resizeImage } from '@/lib/resizeImage'
import { generatePdfThumbnail } from '@/lib/generatePdfThumbnail'
import { parseDateText } from '@/lib/parseDate'
import MediaCard from '@/components/MediaCard'
import MediaEditSheet from '@/components/MediaEditSheet'
import VideoPlayerSheet from '@/components/VideoPlayerSheet'
import PhotoViewer from '@/components/PhotoViewer'
import AlbumCard from '@/components/AlbumCard'
import AlbumEditSheet from '@/components/AlbumEditSheet'
import NewAlbumSheet from '@/components/NewAlbumSheet'
import BottomNav from '@/components/BottomNav'
import NavSpacer from '@/components/NavSpacer'
import { useAlbums, Album } from '@/hooks/useAlbums'

const DEMO_BOOK_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

type FilterKey = 'alle' | MediaType
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'alle',       label: 'Alle'       },
  { key: 'foto',       label: '📷 Fotos'   },
  { key: 'video',      label: '🎬 Video'   },
  { key: 'audio',      label: '🎵 Audio'   },
  { key: 'dokument',   label: '📄 Dokumente'},
]

const fieldCls = `w-full px-3 py-[10px] rounded-[10px] font-sans text-[14px] bg-[#F2F2F7] outline-none border border-[rgba(0,0,0,0.08)] placeholder-gray-400 focus:border-gray-900 text-gray-900 transition-colors`

// ── Shared date text input ────────────────────────────────────────────────
function DateTextInput({ value, onChange, error }: { value: string; onChange: (v: string) => void; error: boolean }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">
        Wann? <span style={{ color: '#FF3B30' }}>*</span>
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="z.B. Sommer 1958, Jan 1992, 17. Juni 1926, ca. 1960"
        className={fieldCls}
        style={{ borderColor: error ? '#FF3B30' : undefined }}
      />
      {error && (
        <p className="font-sans text-[12px] mt-1" style={{ color: '#FF3B30' }}>
          Bitte mindestens ein Jahr angeben — z.B. 1992 oder ca. 1960
        </p>
      )}
    </div>
  )
}

// ── Video URL form ────────────────────────────────────────────────────────
function VideoForm({ onSave, onClose }: { onSave: (url: string, titel: string, datumText: string) => void; onClose: () => void }) {
  const [url,       setUrl]       = useState('')
  const [titel,     setTitel]     = useState('')
  const [datumText, setDatumText] = useState('')
  const [dateError, setDateError] = useState(false)

  return (
    <div className="px-5 pt-2 pb-6 flex flex-col gap-4">
      <h2 className="font-serif text-[20px] font-bold text-gray-900">Video-Link</h2>
      <div>
        <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">YouTube / Vimeo URL</label>
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className={fieldCls} />
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Titel (optional)</label>
        <input type="text" value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="Wird automatisch geladen" className={fieldCls} />
      </div>
      <DateTextInput value={datumText} onChange={(v) => { setDatumText(v); setDateError(false) }} error={dateError} />
      <div className="flex flex-col gap-2">
        <button
          onClick={() => {
            if (!url.trim()) return
            if (!datumText.trim()) { setDateError(true); return }
            onSave(url.trim(), titel.trim(), datumText.trim())
          }}
          disabled={!url.trim() || !datumText.trim()}
          className="w-full py-3.5 rounded-[10px] bg-gray-900 text-white font-sans font-semibold text-[15px] disabled:opacity-40">
          Speichern
        </button>
        <button onClick={onClose} className="w-full py-3.5 rounded-[10px] bg-[#F2F2F7] text-gray-600 font-sans font-semibold text-[15px]">Abbrechen</button>
      </div>
    </div>
  )
}

// ── File upload form (after file selected) ────────────────────────────────
interface FileFormProps {
  file:        File
  typ:         'foto' | 'audio' | 'dokument'
  previewUrl?: string
  onSave:      (file: File, datumText: string) => void
  onClose:     () => void
}
function FileUploadForm({ file, typ, previewUrl, onSave, onClose }: FileFormProps) {
  const [datumText,   setDatumText]   = useState('')
  const [dateError,   setDateError]   = useState(false)
  const [aiEstimate,  setAiEstimate]  = useState<{ text: string } | null>(null)
  const [estimating,  setEstimating]  = useState(false)
  const [aiDismissed, setAiDismissed] = useState(false)

  useEffect(() => {
    if (typ !== 'foto') return
    setEstimating(true)
    const form = new FormData()
    form.append('file', file)
    fetch('/api/estimate-photo-date', { method: 'POST', body: form })
      .then((r) => r.json())
      .then((res) => {
        if (res.datum_jahr) {
          const text = res.konfidenz === 'niedrig' && res.datum_jahrzehnt
            ? `ca. ${res.datum_jahrzehnt}` : `ca. ${res.datum_jahr}`
          setAiEstimate({ text })
        }
      })
      .catch(() => {})
      .finally(() => setEstimating(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const icon = typ === 'foto' ? '📷' : typ === 'audio' ? '🎵' : '📄'

  return (
    <div className="px-5 pt-2 pb-6 flex flex-col gap-4">
      <h2 className="font-serif text-[20px] font-bold text-gray-900">Datum eingeben</h2>
      <div className="w-full rounded-[12px] overflow-hidden bg-[#F2F2F7] flex items-center justify-center" style={{ height: 100 }}>
        {previewUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={previewUrl} alt="" className="w-full h-full object-cover" />
          : <span className="text-[40px]">{icon}</span>}
      </div>
      <p className="font-sans text-[12px] text-gray-500 -mt-2 truncate">{file.name}</p>

      {typ === 'foto' && !aiDismissed && (
        estimating
          ? <p className="font-sans text-[13px] text-gray-400">🤖 KI schätzt Datum …</p>
          : aiEstimate && !datumText
            ? <div className="rounded-[10px] bg-[#F2F2F7] px-3 py-2.5 flex items-center justify-between gap-3">
                <p className="font-sans text-[13px] text-gray-700">🤖 KI schätzt: <strong>{aiEstimate.text}</strong></p>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => { setDatumText(aiEstimate.text); setAiDismissed(true) }} className="font-sans text-[12px] font-semibold text-gray-900 underline">Übernehmen</button>
                  <button onClick={() => setAiDismissed(true)} className="font-sans text-[12px] text-gray-400">Ignorieren</button>
                </div>
              </div>
            : null
      )}

      <DateTextInput value={datumText} onChange={(v) => { setDatumText(v); setDateError(false) }} error={dateError} />

      <div className="flex flex-col gap-2">
        <button
          onClick={() => {
            if (!datumText.trim()) { setDateError(true); return }
            onSave(file, datumText.trim())
          }}
          disabled={!datumText.trim()}
          className="w-full py-3.5 rounded-[10px] bg-gray-900 text-white font-sans font-semibold text-[15px] disabled:opacity-40">
          Hochladen
        </button>
        <button onClick={onClose} className="w-full py-3.5 rounded-[10px] bg-[#F2F2F7] text-gray-600 font-sans font-semibold text-[15px]">Abbrechen</button>
      </div>
    </div>
  )
}

interface MediaScreenProps { bookId?: string; basePath?: string }

export default function MediaScreen({ bookId: bookIdProp, basePath = '' }: MediaScreenProps) {
  const BOOK_ID = bookIdProp ?? DEMO_BOOK_ID
  const { person }   = usePerson(BOOK_ID)
  const [editing,      setEditing]      = useState<MediaItem | null>(null)
  const [playingVideo, setPlayingVideo] = useState<MediaItem | null>(null)
  const [viewerIndex,  setViewerIndex]  = useState<number | null>(null)
  const [toast,   setToast]     = useState<string | null>(null)
  const [showAdd,     setShowAdd]     = useState(false)
  const [addStep,     setAddStep]     = useState<'menu' | 'video' | 'file'>('menu')
  const [uploading,   setUploading]   = useState(false)
  const [pendingFile,    setPendingFile]    = useState<File | null>(null)
  const [previewUrl,  setPreviewUrl]  = useState<string | undefined>()
  const fileRef  = useRef<HTMLInputElement>(null)
  const fileType = useRef<'foto' | 'audio' | 'dokument'>('foto')

  const { items, loading, reload }                  = useMedia(BOOK_ID)
  const { albums, loading: albumsLoading, reload: reloadAlbums } = useAlbums(BOOK_ID)
  const [editingAlbum,  setEditingAlbum]  = useState<Album | null>(null)
  const [newAlbumOpen,  setNewAlbumOpen]  = useState(false)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  // ── Helper: upload a blob as PDF thumbnail and save URL ───────────────
  async function uploadPdfThumbnail(blob: Blob, mediaId: string): Promise<string> {
    const thumbPath = `${BOOK_ID}/thumbnails/${mediaId}.jpg`
    const { error } = await supabase.storage
      .from('media-files')
      .upload(thumbPath, blob, { upsert: true, contentType: 'image/jpeg' })
    if (error) throw new Error(error.message)
    const { data } = supabase.storage.from('media-files').getPublicUrl(thumbPath)
    await supabase.from('media').update({ thumbnail_url: data.publicUrl }).eq('id', mediaId)
    return data.publicUrl
  }

  // ── Retroactive: generate thumbnails for PDFs that have none ─────────
  const generateMissingThumbnails = useCallback(async (pdfs: MediaItem[]) => {
    for (const item of pdfs) {
      try {
        // Fetch the PDF to get a File object
        const resp  = await fetch(item.url)
        const ab    = await resp.arrayBuffer()
        const file  = new File([ab], `${item.id}.pdf`, { type: 'application/pdf' })
        const thumb = await generatePdfThumbnail(file)
        await uploadPdfThumbnail(thumb, item.id)
      } catch (err) {
        console.warn('PDF thumbnail error for', item.id, err)
      }
    }
    reload()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Trigger retroactive generation once items load
  useEffect(() => {
    if (loading) return
    const missing = items.filter((i) => i.typ === 'dokument' && !i.thumbnailUrl)
    if (missing.length > 0) generateMissingThumbnails(missing)
  }, [items, loading, generateMissingThumbnails])

  function openAdd(type: 'foto' | 'audio' | 'dokument') {
    setShowAdd(false)
    fileType.current = type
    fileRef.current?.click()
  }

  // File selected → show date form before uploading
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    if (fileType.current === 'foto') {
      setPreviewUrl(URL.createObjectURL(file))
    } else {
      setPreviewUrl(undefined)
    }
    setShowAdd(true)
    setAddStep('file')
    if (fileRef.current) fileRef.current.value = ''
  }

  // Actual upload after date confirmed
  async function doUpload(file: File, datumText: string) {
    setShowAdd(false)
    setAddStep('menu')
    setPendingFile(null)
    setUploading(true)
    const typ = fileType.current

    try {
      if (typ !== 'foto' && file.size > 20 * 1024 * 1024) throw new Error('Datei zu groß — max. 20MB')

      let uploadBlob: Blob = file
      if (typ === 'foto') {
        const { blob } = await resizeImage(file, { maxW: 800, maxH: 800 })
        uploadBlob = blob
      }

      const ts   = Date.now()
      const path = `${BOOK_ID}/${typ}/${ts}-${file.name.replace(/[^a-z0-9.]/gi, '_')}`
      const { error: upErr } = await supabase.storage.from('media-files').upload(path, uploadBlob, { upsert: false, contentType: file.type })
      if (upErr) throw new Error(upErr.message)

      const { data } = supabase.storage.from('media-files').getPublicUrl(path)
      // Parse date text via KI
      const parsed = datumText.trim() ? await parseDateText(datumText.trim()) : null

      const { data: inserted, error: dbErr } = await supabase
        .from('media')
        .insert({
          book_id:      BOOK_ID,
          typ,
          url:          data.publicUrl,
          storage_path: path,
          titel:        file.name.replace(/\.[^.]+$/, ''),
          dateigroesse: file.size,
          datum_text:   parsed?.datum_text  || datumText.trim() || null,
          datum_jahr:   parsed?.datum_jahr  ?? null,
          datum_monat:  parsed?.datum_monat ?? null,
          datum_tag:    parsed?.datum_tag   ?? null,
        })
        .select('id')
        .single()
      if (dbErr) throw new Error(dbErr.message)

      if (typ === 'dokument' && inserted?.id) {
        try {
          const thumb = await generatePdfThumbnail(file)
          await uploadPdfThumbnail(thumb, inserted.id)
        } catch (e) { console.warn('PDF thumbnail:', e) }
      }

      reload()
      showToast('✓ Hochgeladen')
    } catch (err) {
      showToast('Fehler: ' + String(err))
    } finally {
      setUploading(false)
    }
  }

  async function handleVideoSave(url: string, titel: string, datumText: string) {
    setAddStep('menu')
    setShowAdd(false)
    const thumbnail = getYouTubeThumbnail(url) ??
      (getVimeoId(url) ? await fetchVimeoThumbnail(url) : null)
    const parsed = datumText.trim() ? await parseDateText(datumText.trim()) : null
    const { error } = await supabase.from('media').insert({
      book_id:       BOOK_ID,
      typ:           'video',
      url,
      thumbnail_url: thumbnail,
      titel:         titel || url,
      datum_text:    parsed?.datum_text  || datumText.trim() || null,
      datum_jahr:    parsed?.datum_jahr  ?? null,
      datum_monat:   parsed?.datum_monat ?? null,
      datum_tag:     parsed?.datum_tag   ?? null,
      groesse:       'wide',
    })
    if (error) { showToast('Fehler: ' + error.message); return }
    reload()
    showToast('✓ Video-Link gespeichert')
  }

  return (
    <main className="mx-auto w-full max-w-[430px] min-h-screen bg-[#F2F2F7]">
      {/* Header */}
      <header className="px-4 pt-10 pb-3">
        <h1 className="font-serif text-[30px] font-bold text-gray-900">{person?.title ?? 'Piet Mutsaers'}</h1>
        <p className="font-sans text-[13px] text-gray-400 mt-0.5">Media</p>
      </header>


      {/* Grid — albums + media mixed by datum_jahr */}
      {(loading || albumsLoading) ? (
        <div className="grid grid-cols-2 gap-[11px] px-4">
          {[...Array(4)].map((_, i) => <div key={i} className="col-span-2 bg-gray-200 animate-pulse rounded-[18px]" style={{ height: 180 }} />)}
        </div>
      ) : items.length === 0 && albums.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <p className="font-sans text-gray-400 text-[15px]">Noch keine Medien.</p>
          <p className="font-sans text-gray-400 text-[13px] mt-1">Tippe ⊕ zum Hinzufügen.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-[11px] px-4">
          {/* Merge and sort by datum_jahr */}
          {[
            ...items.map((i) => ({ type: 'media' as const, key: i.id, jahr: i.datumJahr ?? 9999, item: i })),
            ...albums.map((a) => ({ type: 'album' as const, key: a.id, jahr: a.datumJahr ?? 9999, album: a })),
          ]
            .sort((a, b) => a.jahr - b.jahr)
            .map((entry) =>
              entry.type === 'album' ? (
                <AlbumCard
                  key={entry.key}
                  album={entry.album}
                  onLongPress={setEditingAlbum}
                />
              ) : (
                <MediaCard
                  key={entry.key}
                  item={entry.item}
                  onLongPress={setEditing}
                  onPlayVideo={setPlayingVideo}
                  onViewPhoto={(tapped) => {
                    const photos = items.filter((i) => i.typ === 'foto')
                    const idx    = photos.findIndex((p) => p.id === tapped.id)
                    if (idx !== -1) setViewerIndex(idx)
                  }}
                />
              )
            )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*,audio/*,.pdf,.doc,.docx"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Floating add button */}
      <button
        onClick={() => { setAddStep('menu'); setShowAdd(true) }}
        disabled={uploading}
        className="fixed z-30 flex items-center justify-center rounded-full bg-gray-900 text-white shadow-lg active:opacity-80 disabled:opacity-50"
        style={{ bottom: 84, right: 16, width: 48, height: 48, fontSize: 28, lineHeight: 1 }}
        aria-label="Medium hinzufügen"
      >
        {uploading ? '⏳' : '⊕'}
      </button>

      {/* Add sheet */}
      {showAdd && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[430px] rounded-t-3xl bg-white shadow-2xl overflow-y-auto max-h-[85dvh]">
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>

            {addStep === 'file' && pendingFile ? (
              <FileUploadForm
                file={pendingFile}
                typ={fileType.current}
                previewUrl={previewUrl}
                onSave={(file, datumText) => doUpload(file, datumText)}
                onClose={() => { setShowAdd(false); setPendingFile(null) }}
              />
            ) : addStep === 'video' ? (
              <VideoForm
                onSave={handleVideoSave}
                onClose={() => { setAddStep('menu'); setShowAdd(false) }}
              />
            ) : (
              <div className="px-4 pb-6">
                <p className="text-[13px] font-sans font-semibold text-gray-400 text-center py-3">Was möchtest du hinzufügen?</p>
                <div className="bg-[#F9F9F9] rounded-[14px] overflow-hidden mb-3">
                  {[
                    { icon: '📷', label: 'Einzelnes Foto',       action: () => { setShowAdd(false); openAdd('foto') } },
                    { icon: '🗂️', label: 'Fotoalbum anlegen',   action: () => { setShowAdd(false); setNewAlbumOpen(true) } },
                    { icon: '🎬', label: 'Video-Link eingeben', action: () => setAddStep('video') },
                    { icon: '🎵', label: 'Audio hochladen',     action: () => { setShowAdd(false); openAdd('audio') } },
                    { icon: '📄', label: 'Dokument hochladen',  action: () => { setShowAdd(false); openAdd('dokument') } },
                  ].map((opt, i, arr) => (
                    <div key={opt.label}>
                      <button onClick={opt.action} className="w-full px-4 py-4 text-left font-sans text-[16px] text-gray-900 flex items-center gap-3 active:bg-gray-100">
                        <span>{opt.icon}</span>{opt.label}
                      </button>
                      {i < arr.length - 1 && <div className="h-px bg-gray-100 mx-4" />}
                    </div>
                  ))}
                </div>
                <button onClick={() => setShowAdd(false)} className="w-full py-4 bg-white rounded-[14px] font-sans font-semibold text-[16px] text-gray-900 active:opacity-70">
                  Abbrechen
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <VideoPlayerSheet item={playingVideo} onClose={() => setPlayingVideo(null)} />

      <AlbumEditSheet
        album={editingAlbum}
        onClose={() => setEditingAlbum(null)}
        onSaved={() => { reloadAlbums(); showToast('✓ Album gespeichert') }}
        onDeleted={() => { reloadAlbums(); showToast('Album gelöscht') }}
      />

      <NewAlbumSheet
        open={newAlbumOpen}
        onClose={() => setNewAlbumOpen(false)}
        onSaved={(_, count) => { reloadAlbums(); showToast(`Album erstellt · ${count} Fotos`) }}
      />

      {viewerIndex !== null && (
        <PhotoViewer
          photos={items.filter((i) => i.typ === 'foto')}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}

      <MediaEditSheet
        item={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { reload(); showToast('✓ Gespeichert') }}
        onDeleted={() => { reload(); showToast('Gelöscht') }}
      />

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
