'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { resizeImage } from '@/lib/resizeImage'
import { parseDateText } from '@/lib/parseDate'

const BOOK_ID = 'a1b2c3d4-0000-0000-0000-000000000001'
const MAX_PREVIEW = 7   // show up to this many thumbs before "+N more"

interface Props {
  open:    boolean
  onClose: () => void
  onSaved: (albumId: string, photoCount: number) => void
}

const fieldCls = `w-full px-3 py-[10px] rounded-[10px] font-sans text-[14px] text-gray-900
  bg-[#F2F2F7] outline-none border border-[rgba(0,0,0,0.08)] placeholder-gray-400 focus:border-gray-900`

export default function NewAlbumSheet({ open, onClose, onSaved }: Props) {
  const [step,      setStep]      = useState<1|2>(1)
  const [titel,     setTitel]     = useState('')
  const [datumText, setDatumText] = useState('')
  const [files,     setFiles]     = useState<File[]>([])
  const [previews,  setPreviews]  = useState<string[]>([])
  const [dragOver,  setDragOver]  = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress,  setProgress]  = useState<{ done: number; total: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) { setStep(1); setTitel(''); setDatumText(''); setFiles([]); setPreviews([]); setDragOver(false) }
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const addFiles = useCallback((newFiles: File[]) => {
    const valid = newFiles.filter((f) => f.type.startsWith('image/') && f.size <= 10 * 1024 * 1024)
    setFiles((prev) => {
      const combined = [...prev, ...valid]
      setPreviews(combined.map((f) => URL.createObjectURL(f)))
      return combined
    })
  }, [])

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files ?? []))
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setDragOver(true) }
  function handleDragLeave() { setDragOver(false) }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    addFiles(Array.from(e.dataTransfer.files))
  }

  function removeFile(idx: number) {
    setFiles((prev) => { const n = prev.filter((_, i) => i !== idx); setPreviews(n.map((f) => URL.createObjectURL(f))); return n })
  }

  async function handleCreate() {
    if (!titel.trim()) return
    setUploading(true)
    setProgress({ done: 0, total: files.length })

    try {
      const parsed = datumText.trim() ? await parseDateText(datumText.trim()) : null
      const { data: album, error: albumErr } = await supabase
        .from('albums')
        .insert({
          book_id:     BOOK_ID,
          titel:       titel.trim(),
          datum_text:  parsed?.datum_text  || datumText.trim() || null,
          datum_jahr:  parsed?.datum_jahr  ?? null,
          datum_monat: parsed?.datum_monat ?? null,
          datum_tag:   parsed?.datum_tag   ?? null,
          sortierung:  Date.now(),
        })
        .select('id').single()

      if (albumErr || !album) throw new Error(albumErr?.message ?? 'Album creation failed')

      let coverUrl: string | null = null
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const { blob } = await resizeImage(file, { maxW: 800, maxH: 800 })
        const ts   = Date.now() + i
        const path = `${BOOK_ID}/album/${album.id}/${ts}-${file.name.replace(/[^a-z0-9.]/gi, '_')}`
        await supabase.storage.from('media-files').upload(path, blob, { upsert: false, contentType: 'image/jpeg' })
        const { data } = supabase.storage.from('media-files').getPublicUrl(path)
        await supabase.from('media').insert({
          book_id:      BOOK_ID,
          album_id:     album.id,
          typ:          'foto',
          url:          data.publicUrl,
          storage_path: path,
          titel:        file.name.replace(/\.[^.]+$/, ''),
          // Inherit album date
          datum_text:   parsed?.datum_text  || datumText.trim() || null,
          datum_jahr:   parsed?.datum_jahr  ?? null,
          datum_monat:  parsed?.datum_monat ?? null,
          datum_tag:    parsed?.datum_tag   ?? null,
        })
        if (!coverUrl) coverUrl = data.publicUrl
        setProgress({ done: i + 1, total: files.length })
      }

      if (coverUrl) await supabase.from('albums').update({ cover_url: coverUrl }).eq('id', album.id)
      onSaved(album.id, files.length)
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
      setProgress(null)
    }
  }

  if (!open) return null

  const shown   = previews.slice(0, MAX_PREVIEW)
  const extra   = Math.max(0, previews.length - MAX_PREVIEW)

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={!uploading ? onClose : undefined} />
      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[430px] rounded-t-3xl bg-white shadow-2xl overflow-y-auto max-h-[92dvh]">
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>

        <div className="px-5 pt-2 pb-8 flex flex-col gap-4">
          {step === 1 ? (
            <>
              <h2 className="font-serif text-[22px] font-bold text-gray-900">Neues Fotoalbum</h2>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Name</label>
                <input type="text" value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="z.B. Hochzeit 1958" className={fieldCls} autoFocus />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Wann?</label>
                <input type="text" value={datumText} onChange={(e) => setDatumText(e.target.value)} placeholder="z.B. April 1958, Sommer 1962" className={fieldCls} />
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => titel.trim() && setStep(2)} disabled={!titel.trim()}
                  className="w-full py-3.5 rounded-[10px] bg-gray-900 text-white font-sans font-semibold text-[15px] disabled:opacity-40">
                  Weiter → Fotos wählen
                </button>
                <button onClick={onClose} className="w-full py-3.5 rounded-[10px] bg-[#F2F2F7] text-gray-600 font-sans font-semibold text-[15px]">Abbrechen</button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <button onClick={() => !uploading && setStep(1)} className="font-sans text-[15px] text-gray-600 active:opacity-60 disabled:opacity-40" disabled={uploading}>
                  ‹ Zurück
                </button>
                <h2 className="font-serif text-[20px] font-bold text-gray-900 truncate">{titel}</h2>
              </div>

              {/* Hidden file input — no capture → iOS shows full sheet */}
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFilesSelected} />

              {/* Drop zone */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => !uploading && fileRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && !uploading && fileRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border:       `2px dashed ${dragOver ? '#000' : '#D1D1D6'}`,
                  background:   dragOver ? 'rgba(0,0,0,0.03)' : 'transparent',
                  borderRadius: 14,
                  padding:      '24px 16px',
                  cursor:       uploading ? 'default' : 'pointer',
                  transition:   'border-color 150ms, background 150ms',
                }}
                className="flex flex-col items-center gap-1.5 select-none"
              >
                <span className="text-[28px]">📷</span>
                <p className="font-sans text-[14px] font-medium text-gray-600">Fotos hinzufügen</p>
                <p className="font-sans text-[12px] text-gray-400">Antippen oder Fotos hierher ziehen</p>
                <p className="font-sans text-[12px] text-gray-400">Mehrere Fotos gleichzeitig möglich</p>
                <p className="font-sans text-[11px] text-gray-400">max. 10MB pro Foto · wird auf 800px verkleinert</p>
              </div>

              {/* Previews */}
              {previews.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {shown.map((url, i) => (
                    <div key={i} className="relative flex-shrink-0" style={{ width: 64, height: 64 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" style={{ borderRadius: 8 }} />
                      {!uploading && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                          className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full bg-gray-900 text-white"
                          style={{ width: 18, height: 18, fontSize: 11, lineHeight: 1 }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {extra > 0 && (
                    <div className="flex-shrink-0 flex items-center justify-center bg-[#F2F2F7] font-sans text-[13px] font-semibold text-gray-500"
                      style={{ width: 64, height: 64, borderRadius: 8 }}>
                      +{extra}
                    </div>
                  )}
                </div>
              )}

              {/* Progress */}
              {uploading && progress && (
                <div>
                  <p className="font-sans text-[13px] text-gray-500 mb-1">{progress.done} von {progress.total} Fotos hochgeladen …</p>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-900 rounded-full transition-all duration-300" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <button onClick={handleCreate} disabled={uploading || files.length === 0}
                  className="w-full py-3.5 rounded-[10px] bg-gray-900 text-white font-sans font-semibold text-[15px] disabled:opacity-40">
                  {uploading ? 'Wird erstellt …' : `Album erstellen${files.length > 0 ? ` · ${files.length} ${files.length === 1 ? 'Foto' : 'Fotos'}` : ''}`}
                </button>
                {!uploading && (
                  <button onClick={onClose} className="w-full py-3.5 rounded-[10px] bg-[#F2F2F7] text-gray-600 font-sans font-semibold text-[15px]">Abbrechen</button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
