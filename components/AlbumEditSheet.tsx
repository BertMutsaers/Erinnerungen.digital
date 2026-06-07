'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Album } from '@/hooks/useAlbums'
import { parseDateText } from '@/lib/parseDate'

interface Props {
  album:     Album | null
  onClose:   () => void
  onSaved:   () => void
  onDeleted: () => void
}

const fieldCls = `w-full px-3 py-[10px] rounded-[10px] font-sans text-[14px] text-gray-900
  bg-[#F2F2F7] outline-none border border-[rgba(0,0,0,0.06)] placeholder-gray-400 focus:border-gray-400`

export default function AlbumEditSheet({ album, onClose, onSaved, onDeleted }: Props) {
  const open = album !== null
  const [titel,      setTitel]      = useState('')
  const [datumText,  setDatumText]  = useState('')
  const [saving,     setSaving]     = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting,   setDeleting]   = useState(false)

  useEffect(() => {
    if (!album) return
    setTitel(album.titel)
    setDatumText(album.datumText ?? '')
    setConfirmDel(false)
  }, [album])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open || !album) return null

  async function handleSave() {
    if (!album || !titel.trim()) return
    setSaving(true)
    const parsed = datumText.trim() ? await parseDateText(datumText.trim()) : null
    const { error } = await supabase.from('albums').update({
      titel:      titel.trim(),
      datum_text:  parsed?.datum_text  || datumText.trim() || null,
      datum_jahr:  parsed?.datum_jahr  ?? null,
      datum_monat: parsed?.datum_monat ?? null,
      datum_tag:   parsed?.datum_tag   ?? null,
    }).eq('id', album.id)
    setSaving(false)
    if (!error) { onSaved(); onClose() }
  }

  async function handleDelete() {
    if (!album) return
    setDeleting(true)
    // Delete all media in album from storage
    const { data: photos } = await supabase
      .from('media').select('storage_path').eq('album_id', album.id)
    for (const p of photos ?? []) {
      if (p.storage_path) {
        await supabase.storage.from('media-files').remove([p.storage_path])
      }
    }
    await supabase.from('media').delete().eq('album_id', album.id)
    await supabase.from('albums').delete().eq('id', album.id)
    setDeleting(false)
    onDeleted(); onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[430px] rounded-t-3xl bg-white shadow-2xl overflow-y-auto max-h-[85dvh]">
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
        <div className="px-5 pt-2 pb-10 flex flex-col gap-4">
          <h2 className="font-serif text-[20px] font-bold text-gray-900">Album bearbeiten</h2>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Name</label>
            <input type="text" value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="Albumname" className={fieldCls} />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Wann?</label>
            <input type="text" value={datumText} onChange={(e) => setDatumText(e.target.value)}
              placeholder="z.B. Sommer 1958, April 1992" className={fieldCls} />
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <button onClick={handleSave} disabled={saving || !titel.trim()}
              className="w-full py-3.5 rounded-[10px] bg-gray-900 text-white font-sans font-semibold text-[15px] disabled:opacity-40">
              {saving ? 'Speichern …' : 'Speichern'}
            </button>
            <button onClick={onClose} className="w-full py-3.5 rounded-[10px] bg-[#F2F2F7] text-gray-600 font-sans font-semibold text-[15px]">Abbrechen</button>
          </div>

          {!confirmDel ? (
            <button onClick={() => setConfirmDel(true)} className="text-[13px] text-red-500 font-sans text-center w-full py-1">Album und alle Fotos löschen</button>
          ) : (
            <div className="border border-red-100 bg-red-50 rounded-[12px] p-4 flex flex-col gap-3">
              <p className="text-[13px] text-gray-700 font-sans text-center leading-snug">
                Album und alle Fotos löschen?<br/><span className="text-gray-400">Das kann nicht rückgängig gemacht werden.</span>
              </p>
              <div className="flex gap-2">
                <button onClick={handleDelete} disabled={deleting}
                  className="flex-1 py-2.5 rounded-[10px] bg-red-600 text-white font-sans font-semibold text-[14px] disabled:opacity-40">
                  {deleting ? '…' : 'Löschen'}
                </button>
                <button onClick={() => setConfirmDel(false)} className="flex-1 py-2.5 rounded-[10px] bg-[#F2F2F7] text-gray-600 font-sans font-semibold text-[14px]">Abbrechen</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
