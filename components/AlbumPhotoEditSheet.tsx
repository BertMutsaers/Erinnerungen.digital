'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { MediaItem } from '@/hooks/useMedia'
import { resizeImage } from '@/lib/resizeImage'
import { parseDateText } from '@/lib/parseDate'

interface Props {
  photo:      MediaItem | null
  albumDate?: string        // album's datum_text for the hint
  onClose:    () => void
  onSaved:    () => void
  onRemoved:  () => void    // photo removed from album (album_id = null)
}

const fieldCls = `w-full px-3 py-[10px] rounded-[10px] font-sans text-[14px] text-gray-900
  bg-[#F2F2F7] outline-none border border-[rgba(0,0,0,0.06)] placeholder-gray-400 focus:border-gray-400`

export default function AlbumPhotoEditSheet({ photo, albumDate, onClose, onSaved, onRemoved }: Props) {
  const open = photo !== null

  const [titel,        setTitel]        = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [datumText,    setDatumText]    = useState('')
  const [previewUrl,   setPreviewUrl]   = useState<string | null>(null)
  const [pendingBlob,  setPendingBlob]  = useState<Blob | null>(null)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [confirmRemove,setConfirmRemove]= useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!photo) return
    setTitel(photo.titel ?? '')
    setBeschreibung(photo.beschreibung ?? '')
    setDatumText(photo.datumText ?? '')
    setPreviewUrl(null)
    setPendingBlob(null)
    setConfirmRemove(false)
  }, [photo])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open || !photo) return null

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoLoading(true)
    try {
      const { blob } = await resizeImage(file, { maxW: 800, maxH: 800 })
      setPreviewUrl(URL.createObjectURL(blob))
      setPendingBlob(blob)
    } finally { setPhotoLoading(false) }
  }

  async function handleSave() {
    if (!photo) return
    setSaving(true)
    try {
      let fotoUrl = photo.url
      let storagePath = photo.storagePath

      if (pendingBlob) {
        const path = photo.storagePath ?? `a1b2c3d4-0000-0000-0000-000000000001/foto/${Date.now()}.jpg`
        await supabase.storage.from('media-files').upload(path, pendingBlob, { upsert: true, contentType: 'image/jpeg' })
        const { data } = supabase.storage.from('media-files').getPublicUrl(path)
        fotoUrl = data.publicUrl
        storagePath = path
      }

      const parsed = datumText.trim() ? await parseDateText(datumText.trim()) : null

      const { error } = await supabase.from('media').update({
        titel:        titel         || null,
        beschreibung: beschreibung  || null,
        datum_text:   parsed?.datum_text  || datumText.trim() || null,
        datum_jahr:   parsed?.datum_jahr  ?? null,
        datum_monat:  parsed?.datum_monat ?? null,
        datum_tag:    parsed?.datum_tag   ?? null,
        url:          fotoUrl,
        storage_path: storagePath ?? null,
      }).eq('id', photo.id)

      if (error) throw new Error(error.message)
      onSaved(); onClose()
    } catch (err) {
      console.error(err)
    } finally { setSaving(false) }
  }

  async function handleRemove() {
    if (!photo) return
    const { error } = await supabase.from('media').update({ album_id: null }).eq('id', photo.id)
    if (!error) { onRemoved(); onClose() }
  }

  const displayUrl = previewUrl ?? photo.url

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[430px] rounded-t-3xl bg-white shadow-2xl overflow-y-auto max-h-[92dvh]">
        <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-white z-10">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-5 pt-2 pb-10 flex flex-col gap-4">
          <h2 className="font-serif text-[22px] font-bold text-gray-900">Foto bearbeiten</h2>

          {/* 1. Photo preview + replace */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Foto ersetzen</label>
            <div className="relative w-full rounded-[12px] overflow-hidden" style={{ height: 100 }}>
              <Image src={displayUrl} alt="" fill className="object-cover" sizes="430px" unoptimized={!!previewUrl} />
              {photoLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <span className="text-white text-[13px] font-sans">⏳</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-2 w-full py-2.5 rounded-[10px] bg-[#F2F2F7] text-gray-600 text-[13px] font-sans font-medium active:opacity-70"
            >
              📷 Foto ersetzen
            </button>
          </div>

          {/* 2. Titel */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Titel</label>
            <input type="text" value={titel} onChange={(e) => setTitel(e.target.value)}
              placeholder='z.B. Hochzeit auf dem Standesamt' className={fieldCls} />
          </div>

          {/* 3. Bildunterschrift */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Bildunterschrift</label>
            <textarea value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)}
              placeholder='Was siehst du auf diesem Bild? Wer ist dabei? Was war der Anlass?'
              className={`${fieldCls} resize-none`} style={{ minHeight: 80 }} />
          </div>

          {/* 4. Datum */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Wann?</label>
            <input type="text" value={datumText} onChange={(e) => setDatumText(e.target.value)}
              placeholder='z.B. April 1958' className={fieldCls} />
            {albumDate && !datumText.trim() && (
              <p className="font-sans text-[12px] text-gray-400 mt-1">
                Leer lassen um Album-Datum zu verwenden ({albumDate})
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="w-full py-3.5 rounded-[10px] bg-gray-900 text-white font-sans font-semibold text-[15px] disabled:opacity-40">
              {saving ? 'KI parst Datum …' : 'Speichern'}
            </button>
            <button onClick={onClose}
              className="w-full py-3.5 rounded-[10px] bg-[#F2F2F7] text-gray-600 font-sans font-semibold text-[15px]">
              Abbrechen
            </button>
          </div>

          {/* Remove from album */}
          {!confirmRemove ? (
            <button onClick={() => setConfirmRemove(true)}
              className="text-[13px] text-red-500 font-sans text-center w-full py-1">
              Aus Album entfernen
            </button>
          ) : (
            <div className="border border-red-100 bg-red-50 rounded-[12px] p-4 flex flex-col gap-3">
              <p className="text-[13px] text-gray-700 font-sans text-center leading-snug">
                Foto aus Album entfernen?<br />
                <span className="text-gray-400">Das Foto bleibt in deiner Media-Bibliothek.</span>
              </p>
              <div className="flex gap-2">
                <button onClick={handleRemove}
                  className="flex-1 py-2.5 rounded-[10px] bg-red-600 text-white font-sans font-semibold text-[14px]">
                  Entfernen
                </button>
                <button onClick={() => setConfirmRemove(false)}
                  className="flex-1 py-2.5 rounded-[10px] bg-[#F2F2F7] text-gray-600 font-sans font-semibold text-[14px]">
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
