'use client'

/**
 * OnboardingScreen
 * Erscheint einmalig für neue Nutzer ohne gesetzten Vornamen.
 * Vorname ist Pflichtfeld — kein Überspringen möglich.
 * Kein Avatar-Upload hier; das gehört in /konto.
 * Speicher-Logik identisch mit KontoClient (profiles.upsert).
 */

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/Logo'
import type { User } from '@supabase/supabase-js'

interface Props {
  user:   User
  onDone: () => void   // nach erfolgreichem Speichern → Dashboard neu laden
}

const fieldCls = `w-full px-4 py-[13px] rounded-[12px] font-sans text-[15px] text-gray-900
  bg-[#F2F2F7] outline-none border border-[rgba(0,0,0,0.06)]
  placeholder-gray-400 focus:border-gray-400 transition-colors`

export default function OnboardingScreen({ user, onDone }: Props) {
  const [vorname,     setVorname]     = useState('')
  const [nachname,    setNachname]    = useState('')
  const [anzeigename, setAnzeigename] = useState('')
  const [saving,      setSaving]      = useState(false)
  const [saveError,   setSaveError]   = useState<string | null>(null)
  const [submitted,   setSubmitted]   = useState(false)

  const vornameValid = vorname.trim().length > 0

  async function handleSave() {
    setSubmitted(true)
    if (!vornameValid) return   // Pflichtfeld — kein Fortfahren ohne Vorname
    setSaving(true)
    setSaveError(null)
    // Identische Upsert-Logik wie KontoClient
    const { error } = await supabase.from('profiles').upsert({
      id:          user.id,
      vorname:     vorname.trim(),
      nachname:    nachname.trim()    || null,
      anzeigename: anzeigename.trim() || null,
      // anzeigename bleibt leer in der DB wenn nicht ausgefüllt —
      // wird NICHT mit dem Vornamen befüllt (Fallback nur bei der ANZEIGE)
    }, { onConflict: 'id' })
    setSaving(false)
    if (error) {
      setSaveError(error.message)
    } else {
      onDone()
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F2F2F7' }}>

      {/* Header — nur Logo */}
      <header className="flex items-center justify-center px-5 py-4 bg-white border-b border-gray-100">
        <Logo variant="text" height={28} />
      </header>

      <main className="flex-1 flex flex-col max-w-[430px] w-full mx-auto px-5 py-10 gap-7">

        {/* Begrüßung */}
        <div className="text-center">
          <p className="text-[36px] mb-3">👋</p>
          <h1 className="font-serif font-bold text-[28px] text-gray-900 leading-tight mb-3">
            Herzlich willkommen!
          </h1>
          <p className="font-sans text-[15px] leading-relaxed" style={{ color: '#6B6B6B', maxWidth: 320, margin: '0 auto' }}>
            Damit wir dich richtig ansprechen können, sag uns kurz, wie du heißt.
            Ein Profilfoto und mehr kannst du später in deinem Konto ergänzen.
          </p>
        </div>

        {/* Felder */}
        <div className="flex flex-col gap-4">

          {/* Vorname — Pflicht */}
          <div>
            <label className="block font-sans text-[11px] uppercase tracking-widest text-gray-400 mb-1.5">
              Vorname <span style={{ color: '#FF3B30' }}>*</span>
            </label>
            <input
              type="text"
              value={vorname}
              onChange={(e) => { setVorname(e.target.value); if (submitted) setSubmitted(false) }}
              placeholder="Dein Vorname"
              autoFocus
              className={fieldCls}
              style={submitted && !vornameValid ? { borderColor: '#FF3B30' } : {}}
            />
            {submitted && !vornameValid && (
              <p className="font-sans text-[12px] mt-1.5" style={{ color: '#FF3B30' }}>
                Bitte gib deinen Vornamen ein — damit können wir dich richtig ansprechen.
              </p>
            )}
          </div>

          {/* Nachname — optional */}
          <div>
            <label className="block font-sans text-[11px] uppercase tracking-widest text-gray-400 mb-1.5">
              Nachname
              <span className="ml-1.5 normal-case tracking-normal font-normal italic" style={{ fontSize: 11, color: '#AEAEB2' }}>
                optional
              </span>
            </label>
            <input
              type="text"
              value={nachname}
              onChange={(e) => setNachname(e.target.value)}
              placeholder="Dein Nachname"
              className={fieldCls}
            />
          </div>

          {/* Anzeigename — optional */}
          <div>
            <label className="block font-sans text-[11px] uppercase tracking-widest text-gray-400 mb-1.5">
              Wie sollen wir dich nennen?
              <span className="ml-1.5 normal-case tracking-normal font-normal italic" style={{ fontSize: 11, color: '#AEAEB2' }}>
                optional
              </span>
            </label>
            <input
              type="text"
              value={anzeigename}
              onChange={(e) => setAnzeigename(e.target.value)}
              placeholder="z.B. Spitzname oder Kürzel"
              className={fieldCls}
            />
            <p className="font-sans text-[12px] mt-1.5" style={{ color: '#B0B0B0' }}>
              Wenn leer, sprechen wir dich mit deinem Vornamen an.
            </p>
          </div>
        </div>

        {saveError && (
          <p className="font-sans text-[13px] text-center" style={{ color: '#C0392B' }}>
            Fehler beim Speichern: {saveError}
          </p>
        )}

        {/* Speichern-Button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-[14px] font-sans font-semibold text-[16px] text-white active:opacity-80 disabled:opacity-40 transition-opacity"
          style={{ background: '#1C1C1E' }}
        >
          {saving ? 'Wird gespeichert …' : 'Los geht\'s →'}
        </button>

        {/* Kein "Später"-Link — Vorname ist Pflicht */}

      </main>
    </div>
  )
}
