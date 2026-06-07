'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Memory, CardColor } from '@/lib/types'
import { resizeImage, ImageInfo } from '@/lib/resizeImage'

interface Props {
  memory:    Memory | null
  onClose:   () => void
  onSaved:   () => void
  onDeleted: () => void
}

const BOOK_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

const KATEGORIEN = [
  { value: 'kindheit',    label: 'Kindheit & Jugend' },
  { value: 'ausbildung',  label: 'Ausbildung' },
  { value: 'militaer',    label: 'Militär' },
  { value: 'wanderjahre', label: 'Wanderjahre' },
  { value: 'familie',     label: 'Familie' },
  { value: 'beruf',       label: 'Beruf / Bedford' },
  { value: 'sonstiges',   label: 'Sonstiges' },
]

const ICON_OPTIONS = ['👶','💍','✝️','🎓','🏆','🏢','🚶','⚔️','📚','🏗️','❤️','📷']

const COLORS: { value: CardColor; bg: string; border: string; activeBorder: string }[] = [
  { value: 'weiss',   bg: '#FFFFFF', border: 'rgba(0,0,0,0.12)', activeBorder: '#000' },
  { value: 'gold',    bg: '#F5F0E8', border: 'rgba(0,0,0,0.10)', activeBorder: '#000' },
  { value: 'rose',    bg: '#FDF0F0', border: 'rgba(0,0,0,0.10)', activeBorder: '#000' },
  { value: 'blau',    bg: '#F0F4FF', border: 'rgba(0,0,0,0.10)', activeBorder: '#000' },
  { value: 'schwarz', bg: '#1C1C1E', border: 'rgba(255,255,255,0.15)', activeBorder: '#666' },
]

const SIZES: { value: 'small' | 'medium' | 'large'; label: string; sub: string }[] = [
  { value: 'small',  label: 'SM', sub: '1 × 1' },
  { value: 'medium', label: 'MD', sub: '2 × 1' },
  { value: 'large',  label: 'LG', sub: '2 × 2' },
]

const fieldCls = `w-full px-3 py-[10px] rounded-[10px] font-sans text-[14px] text-gray-900
  bg-[#F2F2F7] outline-none transition-colors
  border border-[rgba(0,0,0,0.06)] placeholder-gray-400
  focus:border-gray-400`

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">
    {children}
  </label>
)

function storagePath(memoryId: string) {
  return `${BOOK_ID}/${memoryId}.jpg`
}

export default function EditSheet({ memory, onClose, onSaved, onDeleted }: Props) {
  const [datum,        setDatum]        = useState('')
  const [titel,        setTitel]        = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [kategorie,    setKategorie]    = useState('sonstiges')
  const [icon,         setIcon]         = useState('📝')
  const [cardColor,    setCardColor]    = useState<CardColor>('weiss')
  const [cardSize,     setCardSize]     = useState<'small'|'medium'|'large'>('medium')

  // Photo state
  const [existingUrl,    setExistingUrl]    = useState<string | null>(null)
  const [previewUrl,     setPreviewUrl]     = useState<string | null>(null)
  const [pendingBlob,    setPendingBlob]    = useState<Blob | null>(null)
  const [imageInfo,      setImageInfo]      = useState<ImageInfo | null>(null)
  const [pendingDelete,  setPendingDelete]  = useState(false)
  const [photoLoading,   setPhotoLoading]   = useState(false)
  const [photoError,     setPhotoError]     = useState<string | null>(null)
  const [dragOver,       setDragOver]       = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [saving,        setSaving]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [toast,         setToast]        = useState<string | null>(null)

  useEffect(() => {
    if (!memory) return
    setDatum(memory.datumLabel ?? '')
    setTitel(memory.title ?? '')
    setBeschreibung(memory.body ?? '')
    setKategorie(memory.kategorie ?? 'sonstiges')
    setIcon(memory.icon ?? '📝')
    setCardColor(memory.cardColor ?? 'weiss')
    const s = memory.pinnedSize ?? memory.cardSize
    setCardSize(s === 'lg-black' ? 'large' : s === 'large' ? 'large' : s === 'medium' ? 'medium' : 'small')
    setConfirmDelete(false)
    // Reset photo state
    setExistingUrl(memory.imageUrl ?? null)
    setPreviewUrl(null)
    setPendingBlob(null)
    setImageInfo(null)
    setPendingDelete(false)
    setPhotoError(null)
  }, [memory])

  useEffect(() => {
    if (memory) document.body.style.overflow = 'hidden'
    else        document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [memory])

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  if (!memory) return null

  async function processFile(file: File) {
    setPhotoError(null)
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError('Bild zu groß. Bitte ein Bild unter 10MB wählen.')
      return
    }
    setPhotoLoading(true)
    try {
      const { blob, info } = await resizeImage(file)
      setPreviewUrl(URL.createObjectURL(blob))
      setPendingBlob(blob)
      setImageInfo(info)
      setPendingDelete(false)
    } catch (err) {
      setPhotoError(String(err))
    } finally {
      setPhotoLoading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave() { setDragOver(false) }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  function handlePhotoDelete() {
    setPendingDelete(true)
    setPreviewUrl(null)
    setPendingBlob(null)
    setImageInfo(null)
    setExistingUrl(null)
  }

  function handlePhotoReplace() { fileInputRef.current?.click() }

  // Displayed photo: new preview > existing > none
  const displayUrl = previewUrl ?? existingUrl

  async function handleSave() {
    if (!memory) return
    setSaving(true)

    try {
      let fotoUrl: string | null | undefined = undefined // undefined = no change

      // Upload new photo
      if (pendingBlob) {
        const path = storagePath(memory.id)
        const { error: upErr } = await supabase.storage
          .from('memories-photos')
          .upload(path, pendingBlob, { upsert: true, contentType: 'image/jpeg' })
        if (upErr) throw new Error('Foto-Upload: ' + upErr.message)

        const { data } = supabase.storage.from('memories-photos').getPublicUrl(path)
        fotoUrl = data.publicUrl
      }

      // Delete photo
      if (pendingDelete && !pendingBlob) {
        await supabase.storage.from('memories-photos').remove([storagePath(memory.id)])
        fotoUrl = null
      }

      const update: Record<string, unknown> = {
        title:           titel        || null,
        body:            beschreibung || null,
        datum_label:     datum        || null,
        kategorie,
        icon,
        card_color:      cardColor,
        card_size:       cardSize,
        groesse_manuell: true,
      }
      if (fotoUrl !== undefined) update.foto_url = fotoUrl

      const { error } = await supabase.from('memories').update(update).eq('id', memory.id)
      if (error) throw new Error(error.message)

      onSaved()
      onClose()
    } catch (err) {
      setToast('Fehler: ' + String(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!memory) return
    // Also remove photo from storage
    await supabase.storage.from('memories-photos').remove([storagePath(memory.id)])
    const { error } = await supabase.from('memories').delete().eq('id', memory.id)
    if (error) { setToast('Fehler: ' + error.message); return }
    onDeleted()
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[430px]
        rounded-t-3xl bg-white shadow-2xl overflow-y-auto max-h-[92dvh]">

        <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-white z-10">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-5 pt-2 pb-10 flex flex-col gap-5">
          <h2 className="font-serif text-[22px] font-bold text-gray-900">
            Erinnerung bearbeiten
          </h2>

          {/* ── FOTO ──────────────────────────────────────────────────── */}
          <div>
            <Label>Foto</Label>
            <p className="text-[11px] text-gray-400 font-sans mb-2">
              Nur 1 Foto pro Ereignis. Für Fotogalerien → Fotos-Bereich
            </p>

            {/* Hidden file input — no capture so iOS shows full sheet */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {displayUrl ? (
              /* ── Preview ── */
              <div className="flex flex-col gap-2">
                <div className="relative w-full rounded-[14px] overflow-hidden" style={{ height: 160 }}>
                  <Image
                    src={displayUrl}
                    alt="Vorschau"
                    fill
                    className="object-cover"
                    sizes="430px"
                    unoptimized={!!previewUrl}
                  />
                </div>
                {imageInfo && (
                  <p className="text-[11px] text-gray-400 font-sans">
                    {imageInfo.width} × {imageInfo.height}px · {imageInfo.kb} KB
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePhotoReplace}
                    className="flex-1 py-2.5 rounded-[10px] bg-[#F2F2F7] text-gray-600
                      text-[13px] font-sans font-medium active:opacity-70"
                  >
                    🔄 Ersetzen
                  </button>
                  <button
                    type="button"
                    onClick={handlePhotoDelete}
                    className="flex-1 py-2.5 rounded-[10px] bg-[#FFF0F0] text-red-500
                      text-[13px] font-sans font-medium active:opacity-70"
                  >
                    🗑️ Löschen
                  </button>
                </div>
              </div>
            ) : (
              /* ── Drop zone ── */
              <div
                role="button"
                tabIndex={0}
                onClick={() => !photoLoading && fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${dragOver ? '#000' : '#D1D1D6'}`,
                  background: dragOver ? 'rgba(0,0,0,0.03)' : 'transparent',
                  borderRadius: 14,
                  padding: '24px 16px',
                  cursor: photoLoading ? 'default' : 'pointer',
                  transition: 'border-color 150ms, background 150ms',
                }}
                className="flex flex-col items-center gap-1.5 select-none"
              >
                {photoLoading ? (
                  <>
                    <span className="text-[26px]">⏳</span>
                    <p className="font-sans text-[13px] text-gray-500 font-medium">
                      Wird verkleinert und hochgeladen…
                    </p>
                    {/* Indeterminate progress bar */}
                    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-gray-400 rounded-full"
                        style={{ width: '60%', animation: 'pulse 1.2s ease-in-out infinite' }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-[26px]">📷</span>
                    <p className="font-sans text-[14px] text-gray-600 font-medium">
                      Foto hinzufügen
                    </p>
                    <p className="font-sans text-[12px] text-gray-400">
                      Antippen oder Foto hierher ziehen
                    </p>
                    <p className="font-sans text-[11px] text-gray-400">
                      max. 10MB · wird auf 800px verkleinert
                    </p>
                  </>
                )}
              </div>
            )}

            {photoError && (
              <p className="text-[12px] text-red-500 font-sans mt-1.5">{photoError}</p>
            )}
          </div>

          {/* ── DATUM ─────────────────────────────────────────────────── */}
          <div>
            <Label>Datum</Label>
            <input
              type="text"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              placeholder="z.B. März 1958, Frühjahr 1923"
              className={fieldCls}
            />
          </div>

          {/* ── KURZTEXT ──────────────────────────────────────────────── */}
          <div>
            <Label>Kurztext</Label>
            <div className="relative">
              <input
                type="text"
                value={titel}
                onChange={(e) => setTitel(e.target.value.slice(0, 60))}
                placeholder="Kurze Beschreibung"
                className={`${fieldCls} pr-12`}
              />
              <span className="absolute right-3 bottom-2.5 text-[11px] text-gray-400 font-sans tabular-nums">
                {titel.length}/60
              </span>
            </div>
          </div>

          {/* ── BESCHREIBUNG ──────────────────────────────────────────── */}
          <div>
            <Label>Beschreibung</Label>
            <textarea
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              placeholder="Vollständiger Text …"
              className={`${fieldCls} resize-none`}
              style={{ minHeight: '120px' }}
            />
          </div>

          {/* ── FARBE ─────────────────────────────────────────────────── */}
          <div>
            <Label>Farbe</Label>
            <div className="flex gap-3 items-center">
              {COLORS.map((c) => {
                const active = cardColor === c.value
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCardColor(c.value)}
                    style={{
                      backgroundColor: c.bg,
                      width:  active ? 40 : 36,
                      height: active ? 40 : 36,
                      borderRadius: '50%',
                      border: `${active ? 3 : 2}px solid ${active ? c.activeBorder : c.border}`,
                      flexShrink: 0,
                      transition: 'all 150ms ease',
                    }}
                    aria-label={c.value}
                  />
                )
              })}
            </div>
          </div>

          {/* ── GRÖSSE ────────────────────────────────────────────────── */}
          <div>
            <Label>Größe</Label>
            <div className="flex gap-2">
              {SIZES.map((s) => {
                const active = cardSize === s.value
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setCardSize(s.value)}
                    className="flex-1 flex flex-col items-center py-2 rounded-[10px] transition-colors"
                    style={{ backgroundColor: active ? '#000' : '#F2F2F7', color: active ? '#fff' : '#555' }}
                  >
                    <span className="font-sans font-semibold text-[13px]">{s.label}</span>
                    <span className="font-sans text-[10px] opacity-60">{s.sub}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── KATEGORIE ─────────────────────────────────────────────── */}
          <div>
            <Label>Kategorie</Label>
            <select
              value={kategorie}
              onChange={(e) => setKategorie(e.target.value)}
              className={`${fieldCls} appearance-none cursor-pointer`}
            >
              {KATEGORIEN.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </div>

          {/* ── ICON ──────────────────────────────────────────────────── */}
          <div>
            <Label>Icon</Label>
            <div className="grid grid-cols-6 gap-2">
              {ICON_OPTIONS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setIcon(em)}
                  className="h-11 rounded-[10px] text-xl flex items-center justify-center transition-colors"
                  style={{ backgroundColor: icon === em ? '#111' : '#F2F2F7' }}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* ── BUTTONS ───────────────────────────────────────────────── */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3.5 rounded-[10px] font-sans font-semibold text-[15px]
                bg-gray-900 text-white active:opacity-80 disabled:opacity-40"
            >
              {saving ? 'Speichern …' : 'Speichern'}
            </button>
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-[10px] font-sans font-semibold text-[15px]
                bg-[#F2F2F7] text-gray-600 active:opacity-70"
            >
              Abbrechen
            </button>
          </div>

          {/* ── LÖSCHEN ───────────────────────────────────────────────── */}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-[13px] text-red-500 font-sans text-center w-full py-1"
            >
              Erinnerung löschen
            </button>
          ) : (
            <div className="border border-red-100 bg-red-50 rounded-[12px] p-4 flex flex-col gap-3">
              <p className="text-[13px] text-gray-700 font-sans text-center leading-snug">
                Erinnerung wirklich löschen?<br/>
                <span className="text-gray-400">Das kann nicht rückgängig gemacht werden.</span>
              </p>
              <div className="flex gap-2">
                <button onClick={handleDelete}
                  className="flex-1 py-2.5 rounded-[10px] bg-red-600 text-white font-sans font-semibold text-[14px] active:opacity-80">
                  Löschen
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-2.5 rounded-[10px] bg-[#F2F2F7] text-gray-600 font-sans font-semibold text-[14px]">
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>

        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white
            text-[13px] font-sans px-5 py-2.5 rounded-full shadow-lg z-[60]">
            {toast}
          </div>
        )}
      </div>
    </>
  )
}
