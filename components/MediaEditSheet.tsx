'use client'

import { useState, useEffect } from 'react'
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

const SIZES: { value: MediaSize; label: string; sub: string }[] = [
  { value: 'normal', label: '1×1', sub: 'Normal' },
  { value: 'wide',   label: '2×1', sub: 'Breit'  },
  { value: 'tall',   label: '1×2', sub: 'Hoch'   },
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

    let datumFields: Record<string, unknown> = { datum_text: null, datum_tag: null, datum_monat: null, datum_jahr: null }

    if (datumText.trim()) {
      const parsed = await parseDateText(datumText.trim())
      if (!parsed.datum_jahr) {
        setDateError(true)
        setSaving(false)
        return
      }
      datumFields = {
        datum_text:  parsed.datum_text || datumText.trim(),
        datum_tag:   parsed.datum_tag,
        datum_monat: parsed.datum_monat,
        datum_jahr:  parsed.datum_jahr,
      }
    }

    const { error } = await supabase.from('media').update({
      titel:        titel         || null,
      beschreibung: beschreibung  || null,
      groesse,
      ...datumFields,
    }).eq('id', item.id)

    setSaving(false)
    if (!error) { onSaved(); onClose() }
  }

  async function handleDelete() {
    if (!item) return
    if (item.storagePath) await supabase.storage.from('media-files').remove([item.storagePath])
    await supabase.from('media').delete().eq('id', item.id)
    onDeleted(); onClose()
  }

  const showSizeSelector = item.typ === 'foto' || item.typ === 'dokument'

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

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Bildunterschrift</label>
            <textarea value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} placeholder="Was siehst du auf diesem Bild? Wer ist dabei? Was war der Anlass?" className={`${fieldCls} resize-none`} style={{ minHeight: 80 }} />
          </div>

          {showSizeSelector && (
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
