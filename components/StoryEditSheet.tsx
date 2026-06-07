'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Story } from '@/hooks/useStories'
import { resizeImage } from '@/lib/resizeImage'

const BOOK_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

interface Props {
  open:      boolean
  story:     Story | null    // null = new story
  onClose:   () => void
  onSaved:   () => void
  onDeleted: () => void
}

const fieldCls = `w-full px-3 py-[10px] rounded-[10px] font-sans text-[14px] text-gray-900
  bg-[#F2F2F7] outline-none transition-colors
  border border-[rgba(0,0,0,0.06)] placeholder-gray-400
  focus:border-gray-400`

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">
      {children}
    </label>
  )
}

export default function StoryEditSheet({ open, story, onClose, onSaved, onDeleted }: Props) {
  const isNew = !story?.id

  const [titel,        setTitel]        = useState('')
  const [tag,          setTag]          = useState('')
  const [erzaehler,    setErzaehler]    = useState('')
  const [inhalt,       setInhalt]       = useState('')
  const [existingUrl,  setExistingUrl]  = useState<string | null>(null)
  const [previewUrl,   setPreviewUrl]   = useState<string | null>(null)
  const [pendingBlob,  setPendingBlob]  = useState<Blob | null>(null)
  const [pendingDel,   setPendingDel]   = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [dragOver,     setDragOver]     = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [confirmDel,   setConfirmDel]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setTitel(story?.titel       ?? '')
    setTag(story?.tag           ?? '')
    setErzaehler(story?.erzaehler ?? '')
    setInhalt(story?.inhalt     ?? '')
    setExistingUrl(story?.fotoUrl ?? null)
    setPreviewUrl(null); setPendingBlob(null); setPendingDel(false); setConfirmDel(false)
  }, [story, open])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else      document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose, open])

  if (!open) return null

  async function processFile(file: File) {
    if (file.size > 10 * 1024 * 1024) return
    setPhotoLoading(true)
    try {
      const { blob } = await resizeImage(file, { maxW: 1200, maxH: 800 })
      setPreviewUrl(URL.createObjectURL(blob))
      setPendingBlob(blob)
      setPendingDel(false)
    } finally { setPhotoLoading(false) }
  }

  async function handleSave() {
    if (!titel.trim()) return
    setSaving(true)
    try {
      let fotoUrl: string | null | undefined = undefined

      if (pendingBlob) {
        const storyId = isNew ? crypto.randomUUID() : story!.id
        const path = `${BOOK_ID}/stories/${storyId}.jpg`
        await supabase.storage.from('gallery-photos').upload(path, pendingBlob, { upsert: true, contentType: 'image/jpeg' })
        const { data } = supabase.storage.from('gallery-photos').getPublicUrl(path)
        fotoUrl = data.publicUrl
      } else if (pendingDel) {
        if (story?.fotoUrl) {
          const path = story.fotoUrl.split('/gallery-photos/')[1]
          if (path) await supabase.storage.from('gallery-photos').remove([path])
        }
        fotoUrl = null
      }

      const payload: Record<string, unknown> = { titel, tag: tag || null, erzaehler: erzaehler || null, inhalt: inhalt || null }
      if (fotoUrl !== undefined) payload.foto_url = fotoUrl

      if (isNew) {
        const { error } = await supabase.from('stories').insert({ ...payload, book_id: BOOK_ID })
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from('stories').update(payload).eq('id', story!.id)
        if (error) throw new Error(error.message)
      }

      onSaved(); onClose()
    } catch (err) {
      console.error(err)
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!story?.id) return
    if (story.fotoUrl) {
      const path = story.fotoUrl.split('/gallery-photos/')[1]
      if (path) await supabase.storage.from('gallery-photos').remove([path])
    }
    await supabase.from('stories').delete().eq('id', story.id)
    onDeleted(); onClose()
  }

  const displayUrl = previewUrl ?? existingUrl

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[430px] rounded-t-3xl bg-white shadow-2xl overflow-y-auto max-h-[92dvh]">
        <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-white z-10">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div className="px-5 pt-2 pb-10 flex flex-col gap-4">
          <h2 className="font-serif text-[22px] font-bold text-gray-900">
            {isNew ? 'Neue Geschichte' : 'Geschichte bearbeiten'}
          </h2>

          {/* Foto */}
          <div>
            <Label>Foto</Label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
            {displayUrl ? (
              <div className="flex flex-col gap-2">
                <div className="relative w-full rounded-[12px] overflow-hidden" style={{ height: 140 }}>
                  <Image src={displayUrl} alt="" fill className="object-cover" sizes="430px" unoptimized={!!previewUrl} />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => fileRef.current?.click()} className="flex-1 py-2.5 rounded-[10px] bg-[#F2F2F7] text-gray-600 text-[13px] font-sans font-medium">🔄 Ersetzen</button>
                  <button type="button" onClick={() => { setPendingDel(true); setPreviewUrl(null); setPendingBlob(null); setExistingUrl(null) }} className="flex-1 py-2.5 rounded-[10px] bg-[#FFF0F0] text-red-500 text-[13px] font-sans font-medium">🗑️ Löschen</button>
                </div>
              </div>
            ) : (
              <div
                role="button" tabIndex={0}
                onClick={() => !photoLoading && fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) processFile(f) }}
                style={{ border: `2px dashed ${dragOver ? '#000' : '#D1D1D6'}`, borderRadius: 14, padding: '20px 16px', cursor: 'pointer' }}
                className="flex flex-col items-center gap-1 text-gray-400"
              >
                <span className="text-2xl">{photoLoading ? '⏳' : '📷'}</span>
                <span className="font-sans text-[13px]">{photoLoading ? 'Wird verkleinert…' : 'Foto hinzufügen'}</span>
              </div>
            )}
          </div>

          {/* Titel */}
          <div>
            <Label>Titel</Label>
            <input type="text" value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="Titel der Geschichte" className={fieldCls} />
          </div>

          {/* Tag */}
          <div>
            <Label>Tag / Thema</Label>
            <input type="text" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="z.B. Handwerk, Liebe, Wanderjahre" className={fieldCls} />
          </div>

          {/* Erzähler */}
          <div>
            <Label>Erzählt von</Label>
            <input type="text" value={erzaehler} onChange={(e) => setErzaehler(e.target.value)} placeholder="z.B. Erzählt von Ruth Mutsaers · 1985" className={fieldCls} />
          </div>

          {/* Inhalt */}
          <div>
            <Label>Vollständiger Text</Label>
            <textarea value={inhalt} onChange={(e) => setInhalt(e.target.value)} placeholder="Die Geschichte…" className={`${fieldCls} resize-none`} style={{ minHeight: 180 }} />
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <button onClick={handleSave} disabled={saving || !titel.trim()} className="w-full py-3.5 rounded-[10px] bg-gray-900 text-white font-sans font-semibold text-[15px] disabled:opacity-40">
              {saving ? 'Speichern …' : 'Speichern'}
            </button>
            <button onClick={onClose} className="w-full py-3.5 rounded-[10px] bg-[#F2F2F7] text-gray-600 font-sans font-semibold text-[15px]">Abbrechen</button>
          </div>

          {!isNew && !confirmDel && (
            <button onClick={() => setConfirmDel(true)} className="text-[13px] text-red-500 font-sans text-center w-full py-1">Geschichte löschen</button>
          )}
          {!isNew && confirmDel && (
            <div className="border border-red-100 bg-red-50 rounded-[12px] p-4 flex flex-col gap-3">
              <p className="text-[13px] text-gray-700 font-sans text-center">Wirklich löschen?<br/><span className="text-gray-400">Nicht rückgängig zu machen.</span></p>
              <div className="flex gap-2">
                <button onClick={handleDelete} className="flex-1 py-2.5 rounded-[10px] bg-red-600 text-white font-sans font-semibold text-[14px]">Löschen</button>
                <button onClick={() => setConfirmDel(false)} className="flex-1 py-2.5 rounded-[10px] bg-[#F2F2F7] text-gray-600 font-sans font-semibold text-[14px]">Abbrechen</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
