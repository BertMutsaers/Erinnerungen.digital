'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { resizeProfileImage } from '@/lib/resizeImage'
import { parseDateText } from '@/lib/parseDate'

interface Project {
  id:          string
  titel:       string
  vorname?:    string
  nachname?:   string
  coverUrl?:   string
  shareToken?: string | null
  geburtsdatumText?: string
  geburtsort?:       string
  sterbedatumText?:  string
  sterbeort?:        string
}

interface Props {
  project:         Project | null
  onClose:         () => void
  onSaved:         () => void
  onDeleted:       () => void
  onShareChanged?: () => void   // called after token create/revoke/regenerate
}

const fieldCls = `w-full px-4 py-3 rounded-[12px] font-sans text-[15px] text-gray-900
  bg-[#F2F2F7] outline-none transition-colors
  border border-[rgba(0,0,0,0.08)] placeholder-gray-400
  focus:border-black`

const OptLabel = () => (
  <span style={{ fontSize: 11, color: '#505050', fontStyle: 'italic', fontWeight: 400, marginLeft: 6, textTransform: 'none', letterSpacing: 0 }}>
    optional
  </span>
)

export default function ProjectEditSheet({ project, onClose, onSaved, onDeleted, onShareChanged }: Props) {
  const open = project !== null

  const [vorname,        setVorname]        = useState('')
  const [nachname,       setNachname]       = useState('')
  const [geburtsort,     setGeburtsort]     = useState('')
  const [sterbeort,      setSterbeort]      = useState('')
  const [geburtsdatum,   setGeburtsdatum]   = useState('')
  const [sterbedatum,    setSterbedatum]    = useState('')

  const [previewUrl,     setPreviewUrl]     = useState<string | null>(null)
  const [pendingBlob,    setPendingBlob]    = useState<Blob | null>(null)
  const [photoLoading,   setPhotoLoading]   = useState(false)

  const [saving,         setSaving]         = useState(false)
  const [confirmDelete,  setConfirmDelete]  = useState(false)
  const [deleting,       setDeleting]       = useState(false)

  // ── Share state ────────────────────────────────────────────────────────────
  const [shareToken,      setShareToken]      = useState<string | null>(null)
  const [shareLoading,    setShareLoading]    = useState(false)
  const [copiedLink,      setCopiedLink]      = useState(false)
  const [confirmRevoke,   setConfirmRevoke]   = useState(false)
  const [confirmRegen,    setConfirmRegen]    = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!project) return
    setVorname(project.vorname ?? '')
    setNachname(project.nachname ?? '')
    setGeburtsort(project.geburtsort ?? '')
    setSterbeort(project.sterbeort ?? '')
    setGeburtsdatum(project.geburtsdatumText ?? '')
    setSterbedatum(project.sterbedatumText ?? '')
    setPreviewUrl(null)
    setPendingBlob(null)
    setConfirmDelete(false)
    setConfirmRevoke(false)
    setConfirmRegen(false)
    setShareToken(project.shareToken ?? null)
  }, [project])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open || !project) return null

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) return
    setPhotoLoading(true)
    try {
      const blob = await resizeProfileImage(file)
      setPreviewUrl(URL.createObjectURL(blob))
      setPendingBlob(blob)
    } finally { setPhotoLoading(false) }
  }

  async function handleSave() {
    if (!project || !vorname.trim() || !nachname.trim()) return
    setSaving(true)
    try {
      let coverUrl: string | undefined = undefined

      if (pendingBlob) {
        const path = `${project.id}/profile.jpg`
        await supabase.storage.from('profile-photos').upload(path, pendingBlob, { upsert: true, contentType: 'image/jpeg' })
        const { data } = supabase.storage.from('profile-photos').getPublicUrl(path)
        coverUrl = `${data.publicUrl}?t=${Date.now()}`
        // Update book cover_url too
        await supabase.from('books').update({ cover_url: coverUrl }).eq('id', project.id)
      }

      const [g, s] = await Promise.all([
        geburtsdatum.trim() ? parseDateText(geburtsdatum.trim()) : Promise.resolve(null),
        sterbedatum.trim()  ? parseDateText(sterbedatum.trim())  : Promise.resolve(null),
      ])

      const update: Record<string, unknown> = {
        vorname:     vorname.trim(),
        nachname:    nachname.trim(),
        titel:       `${vorname.trim()} ${nachname.trim()}`,
        geburtsort:  geburtsort.trim() || null,
        sterbeort:   sterbeort.trim()  || null,
        geburtsdatum_text:  g?.datum_text  || geburtsdatum.trim() || null,
        geburtsdatum_jahr:  g?.datum_jahr  ?? null,
        geburtsdatum_monat: g?.datum_monat ?? null,
        geburtsdatum_tag:   g?.datum_tag   ?? null,
        sterbedatum_text:   s?.datum_text  || sterbedatum.trim()  || null,
        sterbedatum_jahr:   s?.datum_jahr  ?? null,
        sterbedatum_monat:  s?.datum_monat ?? null,
        sterbedatum_tag:    s?.datum_tag   ?? null,
      }
      if (coverUrl) update.cover_url = coverUrl

      await supabase.from('projects').update(update).eq('id', project.id)
      await supabase.from('books').update({ title: update.titel }).eq('id', project.id)

      onSaved()
      onClose()
    } catch (err) { console.error(err) } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!project) return
    setDeleting(true)
    // Delete all related data
    await Promise.all([
      supabase.from('memories').delete().eq('book_id', project.id),
      supabase.from('stories').delete().eq('book_id', project.id),
      supabase.from('media').delete().eq('book_id', project.id),
      supabase.from('albums').delete().eq('book_id', project.id),
    ])
    await supabase.from('books').delete().eq('id', project.id)
    await supabase.from('projects').delete().eq('id', project.id)
    setDeleting(false)
    onDeleted()
    onClose()
  }

  // ── Share helpers ──────────────────────────────────────────────────────────

  const shareUrl = shareToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/teilen/${shareToken}`
    : null

  async function handleCreateToken() {
    if (!project) return
    setShareLoading(true)
    try {
      const res = await fetch('/api/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: project.id, action: 'create' }) })
      const json = await res.json()
      if (json.token) { setShareToken(json.token); onShareChanged?.() }
    } finally { setShareLoading(false) }
  }

  async function handleRevokeToken() {
    if (!project) return
    setShareLoading(true)
    try {
      await fetch('/api/share', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: project.id }) })
      setShareToken(null); setConfirmRevoke(false); onShareChanged?.()
    } finally { setShareLoading(false) }
  }

  async function handleRegenToken() {
    if (!project) return
    setShareLoading(true)
    try {
      const res = await fetch('/api/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: project.id, action: 'regenerate' }) })
      const json = await res.json()
      if (json.token) { setShareToken(json.token); setConfirmRegen(false); onShareChanged?.() }
    } finally { setShareLoading(false) }
  }

  async function handleCopyLink() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      // Fallback for HTTP / restricted contexts
      const ta = document.createElement('textarea')
      ta.value = shareUrl
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none'
      document.body.appendChild(ta)
      ta.focus(); ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const displayUrl = previewUrl ?? project.coverUrl

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[430px] rounded-t-3xl bg-white shadow-2xl overflow-y-auto max-h-[92dvh]">
        <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-white z-10">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-5 pt-2 pb-10 flex flex-col gap-5">
          <h2 className="font-serif text-[22px] font-bold text-gray-900">Erinnerungsbuch bearbeiten</h2>

          {/* Photo */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-2 font-sans">Profilfoto</label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            {displayUrl ? (
              <div className="flex flex-col gap-2">
                <div className="relative w-full rounded-[14px] overflow-hidden" style={{ height: 140 }}>
                  <Image src={displayUrl} alt="" fill className="object-cover object-top" sizes="430px" unoptimized />
                </div>
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full py-2.5 rounded-[10px] bg-[#F2F2F7] text-gray-600 text-[13px] font-sans font-medium active:opacity-70">
                  {photoLoading ? '⏳ Wird verarbeitet …' : '🔄 Foto ersetzen'}
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full py-4 rounded-[14px] flex flex-col items-center gap-1 text-gray-400 font-sans active:opacity-70"
                style={{ border: '2px dashed #D1D1D6' }}>
                <span className="text-[24px]">{photoLoading ? '⏳' : '📷'}</span>
                <span className="text-[13px]">{photoLoading ? 'Wird verarbeitet …' : 'Profilfoto hinzufügen'}</span>
              </button>
            )}
          </div>

          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Vorname *</label>
              <input type="text" value={vorname} onChange={(e) => setVorname(e.target.value)} placeholder="Vorname" className={fieldCls} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Nachname *</label>
              <input type="text" value={nachname} onChange={(e) => setNachname(e.target.value)} placeholder="Nachname" className={fieldCls} />
            </div>
          </div>

          {/* Geburtsdatum */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Geburtsdatum *</label>
            <input type="text" value={geburtsdatum} onChange={(e) => setGeburtsdatum(e.target.value)}
              placeholder="z.B. 17. Juni 1926, Sommer 1926" className={fieldCls} />
          </div>

          {/* Geburtsort */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Geburtsort *</label>
            <input type="text" value={geburtsort} onChange={(e) => setGeburtsort(e.target.value)}
              placeholder="z.B. Tilburg" className={fieldCls} />
          </div>

          {/* Sterbedatum */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">
              Sterbedatum <OptLabel />
            </label>
            <input type="text" value={sterbedatum} onChange={(e) => setSterbedatum(e.target.value)}
              placeholder="z.B. 3. September 1982, 1982" className={fieldCls} />
          </div>

          {/* Sterbeort */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">
              Sterbeort <OptLabel />
            </label>
            <input type="text" value={sterbeort} onChange={(e) => setSterbeort(e.target.value)}
              placeholder="z.B. Osnabrück" className={fieldCls} />
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <button onClick={handleSave} disabled={saving || !vorname.trim() || !nachname.trim()}
              className="w-full py-3.5 rounded-[10px] bg-gray-900 text-white font-sans font-semibold text-[15px] disabled:opacity-40">
              {saving ? 'KI parst Datum …' : 'Speichern'}
            </button>
            <button onClick={onClose}
              className="w-full py-3.5 rounded-[10px] bg-[#F2F2F7] text-gray-600 font-sans font-semibold text-[15px]">
              Abbrechen
            </button>
          </div>

          {/* ── Teilen ─────────────────────────────────────────────────── */}
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: 20 }}>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-3 font-sans">Teilen</label>

            {!shareToken ? (
              /* Not shared yet */
              <div className="flex flex-col gap-3">
                <p className="font-sans text-[13px] leading-relaxed" style={{ color: '#6B6B6B' }}>
                  Erstelle einen privaten Link, über den andere dieses Erinnerungsbuch ansehen (aber nicht bearbeiten) können. Nur wer den Link hat, kann es sehen.
                </p>
                <p className="font-sans text-[11px] leading-relaxed" style={{ color: '#B0B0B0' }}>
                  Hinweis: Mit dem Teilen machst du Inhalte für alle zugänglich, die den Link haben.
                </p>
                <button
                  type="button"
                  onClick={handleCreateToken}
                  disabled={shareLoading}
                  className="w-full py-3 rounded-[10px] bg-gray-900 text-white font-sans font-semibold text-[14px] disabled:opacity-40 active:opacity-80">
                  {shareLoading ? '…' : '🔗 Link erstellen'}
                </button>
              </div>
            ) : (
              /* Shared — show link + actions */
              <div className="flex flex-col gap-3">
                {/* Link display */}
                <div className="rounded-[12px] px-4 py-3 font-sans text-[12px] break-all leading-relaxed select-all"
                  style={{ background: '#F2F2F7', color: '#3C3C3E', border: '1px solid rgba(0,0,0,0.07)' }}>
                  {shareUrl}
                </div>

                {/* Copy */}
                <button type="button" onClick={handleCopyLink}
                  className="w-full py-3 rounded-[10px] bg-gray-900 text-white font-sans font-semibold text-[14px] active:opacity-80">
                  {copiedLink ? '✓ Kopiert' : '📋 Link kopieren'}
                </button>

                {/* Revoke */}
                {!confirmRevoke && !confirmRegen && (
                  <button type="button" onClick={() => setConfirmRevoke(true)}
                    className="w-full py-2.5 rounded-[10px] font-sans font-semibold text-[13px] active:opacity-70"
                    style={{ background: '#FFF1F0', color: '#C0392B' }}>
                    Freigabe aufheben
                  </button>
                )}
                {confirmRevoke && (
                  <div className="rounded-[12px] p-4 flex flex-col gap-3" style={{ background: '#FFF1F0', border: '1px solid #FCCAC4' }}>
                    <p className="font-sans text-[13px] text-center" style={{ color: '#5C1A14' }}>
                      Der bisherige Link wird damit ungültig. Fortfahren?
                    </p>
                    <div className="flex gap-2">
                      <button onClick={handleRevokeToken} disabled={shareLoading}
                        className="flex-1 py-2.5 rounded-[10px] font-sans font-semibold text-[13px] text-white disabled:opacity-40"
                        style={{ background: '#C0392B' }}>
                        {shareLoading ? '…' : 'Ja, aufheben'}
                      </button>
                      <button onClick={() => setConfirmRevoke(false)}
                        className="flex-1 py-2.5 rounded-[10px] bg-white font-sans font-semibold text-[13px] text-gray-600">
                        Abbrechen
                      </button>
                    </div>
                  </div>
                )}

                {/* Regenerate */}
                {!confirmRevoke && !confirmRegen && (
                  <button type="button" onClick={() => setConfirmRegen(true)}
                    className="w-full py-2.5 rounded-[10px] bg-[#F2F2F7] text-gray-500 font-sans font-semibold text-[13px] active:opacity-70">
                    Neuen Link erstellen
                  </button>
                )}
                {confirmRegen && (
                  <div className="rounded-[12px] p-4 flex flex-col gap-3" style={{ background: '#F2F2F7', border: '1px solid rgba(0,0,0,0.08)' }}>
                    <p className="font-sans text-[13px] text-center text-gray-700">
                      Der alte Link wird ungültig und ein neuer erstellt. Fortfahren?
                    </p>
                    <div className="flex gap-2">
                      <button onClick={handleRegenToken} disabled={shareLoading}
                        className="flex-1 py-2.5 rounded-[10px] bg-gray-900 text-white font-sans font-semibold text-[13px] disabled:opacity-40">
                        {shareLoading ? '…' : 'Neuen Link erstellen'}
                      </button>
                      <button onClick={() => setConfirmRegen(false)}
                        className="flex-1 py-2.5 rounded-[10px] bg-white font-sans font-semibold text-[13px] text-gray-600">
                        Abbrechen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Delete */}
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="text-[13px] text-red-500 font-sans text-center w-full py-1">
              Erinnerungsbuch löschen
            </button>
          ) : (
            <div className="border border-red-100 bg-red-50 rounded-[12px] p-4 flex flex-col gap-3">
              <p className="text-[13px] text-gray-700 font-sans text-center leading-snug">
                Alle Erinnerungen, Geschichten und Medien werden<br />
                <span className="text-gray-500">unwiderruflich gelöscht.</span>
              </p>
              <div className="flex gap-2">
                <button onClick={handleDelete} disabled={deleting}
                  className="flex-1 py-2.5 rounded-[10px] bg-red-600 text-white font-sans font-semibold text-[14px] disabled:opacity-40">
                  {deleting ? '…' : 'Löschen'}
                </button>
                <button onClick={() => setConfirmDelete(false)}
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
