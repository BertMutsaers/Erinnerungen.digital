'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { usePhotos, Photo } from '@/hooks/usePhotos'
import { usePerson } from '@/hooks/usePerson'
import { useLongPress } from '@/hooks/useLongPress'
import { resizeImage } from '@/lib/resizeImage'
import { supabase } from '@/lib/supabase'
import PhotoEditSheet from '@/components/PhotoEditSheet'
import BottomNav from '@/components/BottomNav'
import NavSpacer from '@/components/NavSpacer'

const BOOK_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

// Individual photo tile with long-press support
function PhotoTile({ photo, onTap, onLong }: { photo: Photo; onTap: (p: Photo) => void; onLong: (p: Photo) => void }) {
  const { handlers, pressing } = useLongPress({ onShortPress: () => onTap(photo), onLongPress: () => onLong(photo) })
  const colSpan = photo.groesse === 'wide' ? 'col-span-2' : 'col-span-1'
  const rowSpan = photo.groesse === 'tall' ? 'row-span-2' : 'row-span-1'
  return (
    <div {...handlers} className={`${colSpan} ${rowSpan} overflow-hidden select-none`}
      style={{ transform: pressing ? 'scale(0.97)' : 'scale(1)', transition: '150ms ease', cursor: 'pointer' }}>
      <div className="relative w-full h-full" style={{ aspectRatio: photo.groesse === 'tall' ? '1/2' : '1/1' }}>
        <Image src={photo.fotoUrl} alt={photo.beschriftung ?? ''} fill className="object-cover" sizes="(max-width:430px) 33vw" unoptimized />
      </div>
    </div>
  )
}

// Photo viewer bottom sheet
function PhotoViewer({ photo, onClose, onEdit }: { photo: Photo | null; onClose: () => void; onEdit: () => void }) {
  if (!photo) return null
  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[430px] rounded-t-3xl bg-white shadow-2xl overflow-hidden">
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
        <div className="relative w-full bg-black" style={{ maxHeight: '60vh' }}>
          <Image src={photo.fotoUrl} alt={photo.beschriftung ?? ''} width={430} height={430} className="w-full object-contain" unoptimized style={{ maxHeight: '60vh' }} />
        </div>
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            {photo.beschriftung && <p className="font-sans text-[16px] text-gray-900">{photo.beschriftung}</p>}
            {photo.jahr && <p className="font-sans text-[12px] text-gray-400 mt-0.5">{photo.jahr}</p>}
          </div>
          <button onClick={onEdit} className="font-sans text-[14px] text-gray-600 flex items-center gap-1">Bearbeiten ✏️</button>
        </div>
      </div>
    </>
  )
}

export default function FotosPage() {
  const { person }  = usePerson(BOOK_ID)
  const { photos, loading, reload } = usePhotos(BOOK_ID)
  const [viewing, setViewing]   = useState<Photo | null>(null)
  const [editing, setEditing]   = useState<Photo | null>(null)
  const [uploading, setUploading] = useState(false)
  const [toast,   setToast]     = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files) {
        const { blob } = await resizeImage(file, { maxW: 1200, maxH: 1200 })
        const id   = crypto.randomUUID()
        const path = `${BOOK_ID}/${id}.jpg`
        await supabase.storage.from('gallery-photos').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
        const { data } = supabase.storage.from('gallery-photos').getPublicUrl(path)
        await supabase.from('photos').insert({
          book_id:      BOOK_ID,
          id,
          storage_path: path,
          foto_url:     data.publicUrl,
          groesse:      'normal',
          sort_order:   Date.now(),
        })
      }
      reload()
      showToast(`✓ ${files.length} ${files.length === 1 ? 'Foto' : 'Fotos'} hochgeladen`)
    } catch (err) {
      showToast('Fehler: ' + String(err))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <main className="mx-auto w-full max-w-[430px] min-h-screen bg-[#F2F2F7]">
      {/* Header */}
      <header className="px-4 pt-10 pb-4">
        <h1 className="font-serif text-[30px] font-bold leading-tight text-gray-900">
          {person?.title ?? 'Piet Mutsaers'}
        </h1>
        <p className="font-sans text-[13px] text-gray-400 mt-0.5">Fotos</p>
      </header>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-[3px]">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="bg-gray-200 animate-pulse" style={{ aspectRatio: '1/1' }} />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <p className="font-sans text-gray-400 text-[15px]">Noch keine Fotos.</p>
          <p className="font-sans text-gray-400 text-[13px] mt-1">Tippe ⊕ um Fotos hinzuzufügen.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-[3px]" style={{ gridAutoRows: '33vw' }}>
          {photos.map((photo) => (
            <PhotoTile
              key={photo.id}
              photo={photo}
              onTap={(p) => setViewing(p)}
              onLong={(p) => setEditing(p)}
            />
          ))}
        </div>
      )}

      {/* Floating upload button */}
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="fixed z-30 flex items-center justify-center rounded-full bg-gray-900 text-white shadow-lg active:opacity-80 disabled:opacity-50"
        style={{ bottom: 84, right: 16, width: 48, height: 48, fontSize: 28, lineHeight: 1 }}
        aria-label="Fotos hinzufügen"
      >
        {uploading ? '⏳' : '⊕'}
      </button>

      <PhotoViewer
        photo={viewing}
        onClose={() => setViewing(null)}
        onEdit={() => { setEditing(viewing); setViewing(null) }}
      />

      <PhotoEditSheet
        photo={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { reload(); showToast('✓ Gespeichert') }}
        onDeleted={() => { reload(); showToast('Foto gelöscht') }}
      />

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] bg-gray-900 text-white text-[13px] font-sans px-5 py-2.5 rounded-full shadow-lg whitespace-nowrap animate-fade-in">
          {toast}
        </div>
      )}

      <NavSpacer />
      <BottomNav />
    </main>
  )
}
