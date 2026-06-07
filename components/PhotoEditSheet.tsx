'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Photo, PhotoSize } from '@/hooks/usePhotos'
import { resizeImage } from '@/lib/resizeImage'

const BOOK_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

interface Props {
  photo:     Photo | null
  onClose:   () => void
  onSaved:   () => void
  onDeleted: () => void
}

const fieldCls = `w-full px-3 py-[10px] rounded-[10px] font-sans text-[14px] text-gray-900
  bg-[#F2F2F7] outline-none transition-colors border border-[rgba(0,0,0,0.06)] placeholder-gray-400 focus:border-gray-400`

const SIZES: { value: PhotoSize; label: string; sub: string }[] = [
  { value: 'normal', label: '1×1', sub: 'Normal' },
  { value: 'wide',   label: '2×1', sub: 'Breit'  },
  { value: 'tall',   label: '1×2', sub: 'Hoch'   },
]

export default function PhotoEditSheet({ photo, onClose, onSaved, onDeleted }: Props) {
  const open = photo !== null

  const [beschriftung, setBeschriftung] = useState('')
  const [jahr,         setJahr]         = useState('')
  const [groesse,      setGroesse]      = useState<PhotoSize>('normal')
  const [previewUrl,   setPreviewUrl]   = useState<string | null>(null)
  const [pendingBlob,  setPendingBlob]  = useState<Blob | null>(null)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [confirmDel,   setConfirmDel]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open || !photo) return
    setBeschriftung(photo.beschriftung ?? '')
    setJahr(photo.jahr ? String(photo.jahr) : '')
    setGroesse(photo.groesse)
    setPreviewUrl(null); setPendingBlob(null); setConfirmDel(false)
  }, [photo, open])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else      document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open || !photo) return null

  async function processFile(file: File) {
    setPhotoLoading(true)
    try {
      const { blob } = await resizeImage(file, { maxW: 1200, maxH: 1200 })
      setPreviewUrl(URL.createObjectURL(blob))
      setPendingBlob(blob)
    } finally { setPhotoLoading(false) }
  }

  async function handleSave() {
    if (!photo) return
    setSaving(true)
    try {
      let fotoUrl = photo.fotoUrl
      let storagePath = photo.storagePath

      if (pendingBlob) {
        const path = `${BOOK_ID}/${photo.id}.jpg`
        await supabase.storage.from('gallery-photos').upload(path, pendingBlob, { upsert: true, contentType: 'image/jpeg' })
        const { data } = supabase.storage.from('gallery-photos').getPublicUrl(path)
        fotoUrl = data.publicUrl
        storagePath = path
      }

      const { error } = await supabase.from('photos').update({
        beschriftung: beschriftung || null,
        jahr:         jahr ? parseInt(jahr) : null,
        groesse,
        foto_url:     fotoUrl,
        storage_path: storagePath,
      }).eq('id', photo.id)

      if (error) throw new Error(error.message)
      onSaved(); onClose()
    } catch (err) { console.error(err) } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!photo) return
    await supabase.storage.from('gallery-photos').remove([photo.storagePath])
    await supabase.from('photos').delete().eq('id', photo.id)
    onDeleted(); onClose()
  }

  const displayUrl = previewUrl ?? photo.fotoUrl

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[430px] rounded-t-3xl bg-white shadow-2xl overflow-y-auto max-h-[92dvh]">
        <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-white z-10">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div className="px-5 pt-2 pb-10 flex flex-col gap-4">
          <h2 className="font-serif text-[22px] font-bold text-gray-900">Foto bearbeiten</h2>

          {/* Preview + replace */}
          <div className="relative w-full rounded-[12px] overflow-hidden" style={{ height: 160 }}>
            <Image src={displayUrl} alt="" fill className="object-cover" sizes="430px" unoptimized={!!previewUrl} />
            <button onClick={() => fileRef.current?.click()} className="absolute bottom-2 right-2 bg-white/90 rounded-full px-3 py-1 text-[12px] font-sans font-medium text-gray-700 shadow-sm">
              {photoLoading ? '⏳' : '🔄 Ersetzen'}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f) }} />

          {/* Beschriftung */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Beschriftung</label>
            <input type="text" value={beschriftung} onChange={(e) => setBeschriftung(e.target.value)} placeholder="Bildunterschrift" className={fieldCls} />
          </div>

          {/* Jahr */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Jahr</label>
            <input type="number" value={jahr} onChange={(e) => setJahr(e.target.value)} placeholder="z.B. 1965" className={fieldCls} />
          </div>

          {/* Größe */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Größe</label>
            <div className="flex gap-2">
              {SIZES.map((s) => (
                <button key={s.value} type="button" onClick={() => setGroesse(s.value)}
                  className="flex-1 flex flex-col items-center py-2 rounded-[10px] transition-colors"
                  style={{ backgroundColor: groesse === s.value ? '#000' : '#F2F2F7', color: groesse === s.value ? '#fff' : '#555' }}>
                  <span className="font-sans font-semibold text-[13px]">{s.label}</span>
                  <span className="font-sans text-[10px] opacity-60">{s.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <button onClick={handleSave} disabled={saving} className="w-full py-3.5 rounded-[10px] bg-gray-900 text-white font-sans font-semibold text-[15px] disabled:opacity-40">{saving ? 'Speichern …' : 'Speichern'}</button>
            <button onClick={onClose} className="w-full py-3.5 rounded-[10px] bg-[#F2F2F7] text-gray-600 font-sans font-semibold text-[15px]">Abbrechen</button>
          </div>

          {!confirmDel ? (
            <button onClick={() => setConfirmDel(true)} className="text-[13px] text-red-500 font-sans text-center w-full py-1">Foto löschen</button>
          ) : (
            <div className="border border-red-100 bg-red-50 rounded-[12px] p-4 flex gap-2">
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-[10px] bg-red-600 text-white font-sans font-semibold text-[14px]">Löschen</button>
              <button onClick={() => setConfirmDel(false)} className="flex-1 py-2.5 rounded-[10px] bg-[#F2F2F7] text-gray-600 font-sans font-semibold text-[14px]">Abbrechen</button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
