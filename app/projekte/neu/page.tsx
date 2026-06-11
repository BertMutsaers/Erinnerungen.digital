'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { resizeProfileImage } from '@/lib/resizeImage'
import Logo from '@/components/Logo'

type Typ = 'person' | 'organisation'

const inputCls = `w-full px-4 py-3 rounded-[12px] font-sans text-[15px] text-gray-900
  bg-white outline-none transition-colors
  border border-[rgba(0,0,0,0.1)] placeholder-gray-400
  focus:border-black`

const TYPEN: { key: Typ; icon: string; titel: string; text: string }[] = [
  { key: 'person',       icon: '👤', titel: 'Person',       text: 'Lebensgeschichte, Biografie, Portrait' },
  { key: 'organisation', icon: '🏛️', titel: 'Organisation', text: 'Unternehmen, Verein, Ort, Projekt' },
]

const ORG_ARTEN = ['Unternehmen', 'Verein', 'Ort', 'Projekt', 'Sonstiges']

export default function NeuesProjektPage() {
  const router = useRouter()
  const [step,      setStep]      = useState<1 | 2>(1)
  const [typ,       setTyp]       = useState<Typ | null>(null)
  const [saving,    setSaving]    = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Person fields
  const [vorname,   setVorname]   = useState('')
  const [nachname,  setNachname]  = useState('')
  const [rohtext,   setRohtext]   = useState('')

  // Photo
  const [previewUrl,  setPreviewUrl]  = useState<string | null>(null)
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null)
  const [photoLoading, setPhotoLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Organisation fields (unchanged)
  const [orgName,         setOrgName]         = useState('')
  const [art,             setArt]             = useState('')
  const [gruendungsjahr,  setGruendungsjahr]  = useState('')
  const [aufloesungsjahr, setAufloesungsjahr] = useState('')
  const [beschreibung,    setBeschreibung]    = useState('')

  const personValid = vorname.trim() && nachname.trim()
  const orgValid    = orgName.trim()
  const formValid   = typ === 'person' ? personValid : orgValid

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoLoading(true)
    try {
      const blob = await resizeProfileImage(file)
      setPreviewUrl(URL.createObjectURL(blob))
      setPendingBlob(blob)
    } finally {
      setPhotoLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (!formValid) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); router.push('/auth'); return }

    let payload: Record<string, unknown> = { user_id: user.id, typ }

    if (typ === 'person') {
      payload = {
        ...payload,
        titel:   `${vorname.trim()} ${nachname.trim()}`,
        vorname: vorname.trim(),
        nachname: nachname.trim(),
        rohtext: rohtext.trim() || null,
      }
    } else {
      payload = {
        ...payload,
        titel:           orgName.trim(),
        firmenname:      orgName.trim(),
        art:             art             || null,
        gruendungsjahr:  gruendungsjahr  ? parseInt(gruendungsjahr)  : null,
        aufloesungsjahr: aufloesungsjahr ? parseInt(aufloesungsjahr) : null,
        untertitel:      beschreibung.trim() || null,
      }
    }

    const { data, error } = await supabase.from('projects').insert(payload).select('id').single()
    if (error || !data) { setSaving(false); return }

    const projectId = data.id

    // Upload photo if provided
    if (pendingBlob) {
      const path = `${projectId}/profile.jpg`
      const { error: upErr } = await supabase.storage
        .from('profile-photos')
        .upload(path, pendingBlob, { upsert: true, contentType: 'image/jpeg' })
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('profile-photos').getPublicUrl(path)
        const coverUrl = `${urlData.publicUrl}?t=${Date.now()}`
        await supabase.from('projects').update({ cover_url: coverUrl }).eq('id', projectId)
        await supabase.from('books').upsert({ cover_url: coverUrl }, { onConflict: 'id' }).eq('id', projectId)
      }
    }

    // Create books record
    const { error: bookErr } = await supabase.from('books').insert({
      id: projectId, owner_id: user.id, title: payload.titel as string, project_id: projectId,
    })
    if (bookErr) console.error('Book insert failed:', bookErr.message)

    window.location.href = `/projekte/${projectId}/zeitstrahl`
  }

  const selected = TYPEN.find(t => t.key === typ)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F2F2F7' }}>
      <header className="sticky top-0 z-30 flex items-center px-6 py-4 bg-white border-b border-gray-100 gap-4">
        <button
          onClick={() => step === 2 ? setStep(1) : router.push('/dashboard')}
          className="font-sans text-[15px] text-gray-500 flex items-center gap-1 active:opacity-60">
          <span className="text-[20px]">‹</span> {step === 2 ? 'Zurück' : 'Dashboard'}
        </button>
        <Logo variant="text" height={22} />
      </header>

      <main className="max-w-[430px] mx-auto px-6 py-10">
        {step === 1 ? (
          /* ── Step 1: Typ wählen ──────────────────────────────────── */
          <>
            <h1 className="font-serif font-bold text-gray-900 mb-2 leading-tight" style={{ fontSize: 28 }}>
              Neues Erinnerungsbuch
            </h1>
            <p className="font-sans text-[14px] mb-10" style={{ color: '#9B9B9B' }}>Worum geht es?</p>
            <div className="flex flex-col gap-4">
              {TYPEN.map((t) => (
                <button key={t.key}
                  onClick={() => { setTyp(t.key); setStep(2); setSubmitted(false) }}
                  style={{
                    border: '1.5px solid rgba(0,0,0,0.08)', background: '#fff',
                    borderRadius: 18, padding: '24px 20px', textAlign: 'left', cursor: 'pointer',
                  }}>
                  <p style={{ fontSize: 32, marginBottom: 10 }}>{t.icon}</p>
                  <p className="font-serif font-bold" style={{ fontSize: 20, marginBottom: 6 }}>{t.titel}</p>
                  <p className="font-sans" style={{ fontSize: 13, color: '#707070', lineHeight: 1.55 }}>{t.text}</p>
                </button>
              ))}
            </div>
          </>
        ) : (
          /* ── Step 2: Formular ────────────────────────────────────── */
          <form onSubmit={handleCreate} className="flex flex-col gap-5">
            <div className="flex items-center gap-3 mb-2">
              <span style={{ fontSize: 32 }}>{selected?.icon}</span>
              <h1 className="font-serif font-bold text-[24px] text-gray-900">{selected?.titel}</h1>
            </div>

            {typ === 'person' && (
              <>
                {/* Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">
                      Vorname <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text" value={vorname} onChange={(e) => setVorname(e.target.value)}
                      placeholder="z.B. Piet" className={inputCls}
                      style={submitted && !vorname.trim() ? { borderColor: '#FF3B30' } : {}}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">
                      Nachname <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text" value={nachname} onChange={(e) => setNachname(e.target.value)}
                      placeholder="z.B. Mutsaers" className={inputCls}
                      style={submitted && !nachname.trim() ? { borderColor: '#FF3B30' } : {}}
                    />
                  </div>
                </div>

                {/* Photo */}
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-2 font-sans">
                    Profilfoto
                    <span style={{ fontSize: 11, color: '#505050', fontStyle: 'italic', fontWeight: 400, marginLeft: 6, textTransform: 'none', letterSpacing: 0 }}>optional</span>
                  </label>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  {previewUrl ? (
                    <div className="flex flex-col gap-2">
                      <div className="relative w-full rounded-[14px] overflow-hidden" style={{ height: 160 }}>
                        <Image src={previewUrl} alt="" fill className="object-cover object-top" sizes="430px" unoptimized />
                      </div>
                      <button type="button" onClick={() => fileRef.current?.click()}
                        className="w-full py-2.5 rounded-[10px] bg-[#F2F2F7] text-gray-600 text-[13px] font-sans font-medium active:opacity-70">
                        {photoLoading ? '⏳ Wird verarbeitet …' : '🔄 Foto ersetzen'}
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="w-full py-6 rounded-[14px] flex flex-col items-center gap-1.5 text-gray-400 font-sans active:opacity-70"
                      style={{ border: '2px dashed #D1D1D6' }}>
                      <span className="text-[28px]">{photoLoading ? '⏳' : '📷'}</span>
                      <span className="text-[13px]">{photoLoading ? 'Wird verarbeitet …' : 'Foto hinzufügen'}</span>
                    </button>
                  )}
                </div>

                {/* Freitext */}
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">
                    Was du weißt
                    <span style={{ fontSize: 11, color: '#505050', fontStyle: 'italic', fontWeight: 400, marginLeft: 6, textTransform: 'none', letterSpacing: 0 }}>optional</span>
                  </label>
                  <textarea
                    value={rohtext}
                    onChange={(e) => setRohtext(e.target.value)}
                    placeholder={"Erzähle frei über das Leben dieser Person – was du weißt, in beliebiger Reihenfolge. Daten, Orte, Ereignisse, Anekdoten. Wir helfen dir später, daraus einen Zeitstrahl zu machen."}
                    className={inputCls}
                    style={{ minHeight: 180, resize: 'vertical', lineHeight: 1.65 }}
                  />
                </div>
              </>
            )}

            {typ === 'organisation' && (
              <>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)}
                    placeholder="z.B. Bedford GmbH" className={inputCls}
                    style={submitted && !orgName.trim() ? { borderColor: '#FF3B30' } : {}} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Art</label>
                    <select value={art} onChange={(e) => setArt(e.target.value)} className={`${inputCls} appearance-none cursor-pointer`}>
                      <option value="">— optional —</option>
                      {ORG_ARTEN.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Gründungsjahr</label>
                    <input type="number" value={gruendungsjahr} onChange={(e) => setGruendungsjahr(e.target.value)} placeholder="z.B. 1969" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Auflösungsjahr</label>
                  <input type="number" value={aufloesungsjahr} onChange={(e) => setAufloesungsjahr(e.target.value)} placeholder="z.B. 2010" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Kurzbeschreibung</label>
                  <textarea value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)}
                    placeholder="Was macht / machte diese Organisation besonders?"
                    className={`${inputCls} resize-none`} style={{ minHeight: 80 }} />
                </div>
              </>
            )}

            <button type="submit" disabled={saving}
              className="w-full py-4 rounded-[14px] bg-gray-900 text-white font-sans font-semibold text-[16px] mt-2 disabled:opacity-40">
              {saving ? 'Wird angelegt …' : 'Erinnerungsbuch erstellen →'}
            </button>

            {submitted && !formValid && (
              <p className="font-sans text-[13px] text-center" style={{ color: '#FF3B30' }}>
                Bitte Vor- und Nachname ausfüllen.
              </p>
            )}
          </form>
        )}
      </main>
    </div>
  )
}
