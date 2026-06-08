'use client'

import { useState, useEffect } from 'react'
import React from 'react'
import { supabase } from '@/lib/supabase'
import { MediaItem, MediaSize } from '@/hooks/useMedia'
import { parseDateText } from '@/lib/parseDate'

interface Props {
  item:      MediaItem | null
  onClose:   () => void
  onSaved:   () => void
  onDeleted: () => void
}

const fieldCls = `w-full px-3 py-[10px] rounded-[10px] font-sans text-[14px] text-gray-900
  bg-[#F2F2F7] outline-none border border-[rgba(0,0,0,0.06)] placeholder-gray-400 focus:border-gray-400 transition-colors`

const SIZES: { value: MediaSize; label: string; svg: React.ReactNode }[] = [
  {
    value: 'normal', label: 'Klein',
    svg: <svg width="32" height="28" viewBox="0 0 32 28"><rect x="2" y="8" width="12" height="12" rx="3" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5"/></svg>,
  },
  {
    value: 'wide',   label: 'Mittel',
    svg: <svg width="32" height="28" viewBox="0 0 32 28"><rect x="2" y="8" width="28" height="12" rx="3" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5"/></svg>,
  },
  {
    value: 'tall' as MediaSize, label: 'Groß',
    svg: <svg width="32" height="28" viewBox="0 0 32 28"><rect x="2" y="2" width="28" height="22" rx="3" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5"/></svg>,
  },
]

export default function MediaEditSheet({ item, onClose, onSaved, onDeleted }: Props) {
  const open = item !== null
  const [titel,        setTitel]        = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [datumText,    setDatumText]    = useState('')
  const [groesse,      setGroesse]      = useState<MediaSize>('normal')
  const [saving,       setSaving]       = useState(false)
  const [dateError,    setDateError]    = useState(false)
  const [confirmDel,   setConfirmDel]   = useState(false)

  useEffect(() => {
    if (!item) return
    setTitel(item.titel ?? '')
    setBeschreibung(item.beschreibung ?? '')
    setDatumText(item.datumText ?? '')
    // Map legacy 'tall' → 'large' (tall removed from UI)
    setGroesse(item.groesse)
    setConfirmDel(false)
    setDateError(false)
  }, [item])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open || !item) return null

  async function handleSave() {
    if (!item) return
    setSaving(true)
    setDateError(false)

    // Parse date if provided — but don't block save if it fails
    let datumFields: Record<string, unknown> = {}

    if (datumText.trim()) {
      try {
        const parsed = await parseDateText(datumText.trim())
        if (parsed.datum_jahr) {
          datumFields = {
            datum_text:  parsed.datum_text || datumText.trim(),
            datum_tag:   parsed.datum_tag,
            datum_monat: parsed.datum_monat,
            datum_jahr:  parsed.datum_jahr,
          }
        } else {
          // Keep existing date fields, just update the text
          datumFields = { datum_text: datumText.trim() }
        }
      } catch {
        datumFields = { datum_text: datumText.trim() }
      }
    }

    const { error } = await supabase.from('media').update({
      titel:        titel         || null,
      beschreibung: beschreibung  || null,
      groesse,
      ...datumFields,
    }).eq('id', item.id)

    setSaving(false)
    if (error) { console.error('MediaEditSheet save error:', error.message); return }
    onSaved()
    onClose()
  }

  async function handleDelete() {
    if (!item) return
    if (item.storagePath) await supabase.storage.from('media-files').remove([item.storagePath])
    await supabase.from('media').delete().eq('id', item.id)
    onDeleted(); onClose()
  }

  const showSizeSelector = item.typ === 'foto'

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[430px] rounded-t-3xl bg-white shadow-2xl overflow-y-auto max-h-[85dvh]">
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
        <div className="px-5 pt-2 pb-10 flex flex-col gap-4">
          <h2 className="font-serif text-[20px] font-bold text-gray-900">Bearbeiten</h2>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Titel</label>
            <input type="text" value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="Titel" className={fieldCls} />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Wann?</label>
            <input
              type="text"
              value={datumText}
              onChange={(e) => { setDatumText(e.target.value); setDateError(false) }}
              placeholder="z.B. Sommer 1958, Jan 1992, 17. Juni 1926, ca. 1960"
              className={fieldCls}
              style={{ borderColor: dateError ? '#FF3B30' : undefined }}
            />
            {dateError && (
              <p className="font-sans text-[12px] mt-1" style={{ color: '#FF3B30' }}>
                Bitte mindestens ein Jahr angeben — z.B. 1992 oder ca. 1960
              </p>
            )}
          </div>

          {(item.typ === 'foto' || item.typ === 'audio') && (
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Bildunterschrift</label>
              <textarea value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} placeholder="Was siehst du auf diesem Bild? Wer ist dabei? Was war der Anlass?" className={`${fieldCls} resize-none`} style={{ minHeight: 80 }} />
            </div>
          )}

          {showSizeSelector && (
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Größe</label>
              <div className="flex gap-2">
                {SIZES.map((s) => {
                  const active = groesse === s.value
                  return (
                    <button key={s.value} type="button" onClick={() => setGroesse(s.value as MediaSize)}
                      className="flex-1 flex flex-col items-center gap-1.5 transition-colors"
                      style={{ backgroundColor: active ? '#000' : '#F2F2F7', color: active ? '#fff' : '#707070', borderRadius: 12, padding: '10px 8px' }}>
                      {s.svg}
                      <span className="font-sans text-[12px] font-medium">{s.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="w-full py-3.5 rounded-[10px] bg-gray-900 text-white font-sans font-semibold text-[15px] disabled:opacity-40">
              {saving ? 'KI parst Datum …' : 'Speichern'}
            </button>
            <button onClick={onClose} className="w-full py-3.5 rounded-[10px] bg-[#F2F2F7] text-gray-600 font-sans font-semibold text-[15px]">Abbrechen</button>
          </div>

          {!confirmDel ? (
            <button onClick={() => setConfirmDel(true)} className="text-[13px] text-red-500 font-sans text-center w-full py-1">Löschen</button>
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
