'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { resizeAvatarImage } from '@/lib/resizeImage'
import type { User } from '@supabase/supabase-js'
import Logo from '@/components/Logo'

interface Profile {
  vorname?:     string
  nachname?:    string
  anzeigename?: string
  avatar_url?:  string
}
interface Props { user: User; profile: Profile | null }

const fieldCls = `w-full px-4 py-[13px] rounded-[12px] font-sans text-[15px] text-gray-900
  bg-[#F2F2F7] outline-none border border-[rgba(0,0,0,0.06)]
  placeholder-gray-400 focus:border-gray-400 transition-colors`

function initials(vorname: string, nachname: string, email: string) {
  const v = vorname[0]?.toUpperCase() ?? ''
  const n = nachname[0]?.toUpperCase() ?? ''
  if (v || n) return v + n
  return email.slice(0, 2).toUpperCase()
}

export default function KontoClient({ user, profile }: Props) {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [vorname,      setVorname]      = useState(profile?.vorname     ?? '')
  const [nachname,     setNachname]     = useState(profile?.nachname    ?? '')
  const [anzeigename,  setAnzeigename]  = useState(profile?.anzeigename ?? '')
  const [avatarUrl,    setAvatarUrl]    = useState(profile?.avatar_url  ?? '')
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [saveError,    setSaveError]    = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  // ── Avatar upload ───────────────────────────────────────────────────────
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (fileRef.current) fileRef.current.value = ''

    setAvatarUploading(true)
    try {
      // Resize in-browser to 400×400 JPEG before any network activity
      const blob = await resizeAvatarImage(file)

      const path = `${user.id}/avatar.jpg`
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      if (upErr) throw new Error(upErr.message)

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      // Cache-bust so the browser fetches the new image immediately
      const urlWithBuster = `${data.publicUrl}?v=${Date.now()}`

      const { error: dbErr } = await supabase
        .from('profiles')
        .upsert({ id: user.id, avatar_url: urlWithBuster }, { onConflict: 'id' })
      if (dbErr) throw new Error(dbErr.message)

      setAvatarUrl(urlWithBuster)
    } catch (err) {
      setSaveError('Avatar-Upload fehlgeschlagen: ' + String(err))
    } finally {
      setAvatarUploading(false)
    }
  }

  // ── Profile save ────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setSaveError(null)

    const { error } = await supabase.from('profiles').upsert({
      id:          user.id,
      vorname:     vorname.trim()     || null,
      nachname:    nachname.trim()    || null,
      anzeigename: anzeigename.trim() || null,
    }, { onConflict: 'id' })

    setSaving(false)
    if (error) {
      console.error('Profil speichern fehlgeschlagen:', error.message)
      setSaveError(error.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const ini = initials(vorname, nachname, user.email ?? '')

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F2F2F7' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1 font-sans text-[15px] text-gray-900 active:opacity-60"
        >
          <span className="text-[20px] leading-none">‹</span>
          <span>Dashboard</span>
        </button>
        <Link href="/dashboard" className="absolute left-1/2 -translate-x-1/2 active:opacity-60">
          <Logo variant="text" height={30} />
        </Link>
        <div style={{ width: 56 }} />
      </header>

      <main className="max-w-[430px] mx-auto px-5 py-8 flex flex-col gap-6">

        {/* Avatar + name — horizontal, left-aligned */}
        <div className="flex items-center gap-4 pt-2 pb-2">
          {/* Avatar — clickable, shows photo or initials */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={avatarUploading}
            className="flex-shrink-0 relative active:opacity-70"
            style={{ width: 64, height: 64 }}
            aria-label="Avatar ändern"
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Avatar"
                fill
                className="rounded-full object-cover"
                sizes="64px"
                unoptimized
              />
            ) : (
              <div
                className="w-full h-full rounded-full bg-gray-900 text-white font-sans font-semibold flex items-center justify-center select-none"
                style={{ fontSize: 22, letterSpacing: '-0.02em' }}
              >
                {ini}
              </div>
            )}
            {/* Camera overlay icon */}
            <div
              className="absolute bottom-0 right-0 flex items-center justify-center rounded-full bg-white border border-gray-200"
              style={{ width: 20, height: 20 }}
            >
              {avatarUploading
                ? <span style={{ fontSize: 10 }}>⏳</span>
                : <span style={{ fontSize: 11 }}>✎</span>
              }
            </div>
          </button>

          <div>
            <p className="font-serif font-bold text-[22px] text-gray-900 leading-tight">
              {vorname.trim() || nachname.trim()
                ? `${vorname.trim()} ${nachname.trim()}`.trim()
                : 'Mein Konto'}
            </p>
            <p className="font-sans text-[13px] mt-0.5" style={{ color: '#9B9B9B' }}>
              {user.email}
            </p>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />

        {/* Profil-Felder */}
        <div className="bg-white rounded-[18px] overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="px-5 pt-5 pb-1">
            <p className="font-sans text-[10px] uppercase tracking-widest text-gray-400 mb-4">Profil</p>
          </div>
          <div className="px-5 pb-5 flex flex-col gap-3">
            <div>
              <label className="block font-sans text-[11px] text-gray-400 mb-1.5 uppercase tracking-widest">Vorname</label>
              <input type="text" value={vorname} onChange={(e) => setVorname(e.target.value)} placeholder="Dein Vorname" className={fieldCls} />
            </div>
            <div>
              <label className="block font-sans text-[11px] text-gray-400 mb-1.5 uppercase tracking-widest">Nachname</label>
              <input type="text" value={nachname} onChange={(e) => setNachname(e.target.value)} placeholder="Dein Nachname" className={fieldCls} />
            </div>
            <div>
              <label className="block font-sans text-[11px] text-gray-400 mb-1.5 uppercase tracking-widest">Anzeigename</label>
              <input type="text" value={anzeigename} onChange={(e) => setAnzeigename(e.target.value)} placeholder="Wie sollen wir dich nennen?" className={fieldCls} />
              <p className="font-sans text-[12px] mt-1.5" style={{ color: '#B0B0B0' }}>
                Wird in der Begrüßung verwendet, wenn gesetzt.
              </p>
            </div>
          </div>
        </div>

        {/* E-Mail (read-only) */}
        <div className="bg-white rounded-[18px] overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="px-5 py-4 flex justify-between items-center">
            <span className="font-sans text-[13px] text-gray-400">E-Mail</span>
            <span className="font-sans text-[14px] text-gray-900">{user.email}</span>
          </div>
        </div>

        {/* Speichern */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-[14px] bg-gray-900 text-white font-sans font-semibold text-[15px] disabled:opacity-40 active:opacity-80 transition-opacity"
        >
          {saved ? '✓ Gespeichert' : saving ? 'Wird gespeichert …' : 'Speichern'}
        </button>
        {saveError && (
          <p className="font-sans text-[13px] text-center" style={{ color: '#C0392B' }}>
            Fehler: {saveError}
          </p>
        )}

        {/* Abmelden */}
        <div className="bg-white rounded-[18px] overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <button
            onClick={handleSignOut}
            className="w-full px-5 py-4 text-left font-sans text-[15px] font-medium active:bg-gray-50"
            style={{ color: '#C0392B' }}
          >
            Abmelden
          </button>
        </div>

      </main>
    </div>
  )
}
