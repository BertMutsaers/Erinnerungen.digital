'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/Logo'

type Typ = 'person' | 'organisation'

const inputCls = `w-full px-4 py-3 rounded-[12px] font-sans text-[15px] text-gray-900
  bg-white outline-none transition-colors
  border border-[rgba(0,0,0,0.1)] placeholder-gray-400
  focus:border-black`

const TYPEN: { key: Typ; icon: string; titel: string; text: string }[] = [
  {
    key:   'person',
    icon:  '👤',
    titel: 'Person',
    text:  'Lebensgeschichte, Biografie, Portrait',
  },
  {
    key:   'organisation',
    icon:  '🏛️',
    titel: 'Organisation',
    text:  'Unternehmen, Verein, Ort, Projekt',
  },
]

const ORG_ARTEN = ['Unternehmen', 'Verein', 'Ort', 'Projekt', 'Sonstiges']

export default function NeuesProjektPage() {
  const router = useRouter()
  const [step,   setStep]   = useState<1 | 2>(1)
  const [typ,    setTyp]    = useState<Typ | null>(null)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  // Person fields
  const [vorname,      setVorname]      = useState('')
  const [nachname,     setNachname]     = useState('')
  const [geburtsdatum, setGeburtsdatum] = useState('')
  const [geburtsort,   setGeburtsort]   = useState('')
  const [sterbedatum,  setSterbedatum]  = useState('')
  const [sterbeort,    setSterbeort]    = useState('')

  // Organisation fields
  const [orgName,         setOrgName]         = useState('')
  const [art,             setArt]             = useState('')
  const [gruendungsjahr,  setGruendungsjahr]  = useState('')
  const [aufloesungsjahr, setAufloesungsjahr] = useState('')
  const [beschreibung,    setBeschreibung]    = useState('')

  function handleTypSelect(t: Typ) { setTyp(t); setStep(2) }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); router.push('/auth'); return }

    let payload: Record<string, unknown> = { user_id: user.id, typ }

    if (typ === 'person') {
      if (!vorname.trim() || !nachname.trim() || !geburtsdatum) {
        setError('Bitte Vorname, Nachname und Geburtsdatum ausfüllen.')
        setSaving(false); return
      }
      payload = {
        ...payload,
        titel:       `${vorname.trim()} ${nachname.trim()}`,
        vorname:     vorname.trim(),
        nachname:    nachname.trim(),
        geburtsdatum: geburtsdatum || null,
        geburtsort:  geburtsort.trim()  || null,
        sterbedatum: sterbedatum        || null,
        sterbeort:   sterbeort.trim()   || null,
      }
    } else {
      if (!orgName.trim()) { setError('Bitte Namen der Organisation eingeben.'); setSaving(false); return }
      payload = {
        ...payload,
        titel:          orgName.trim(),
        firmenname:     orgName.trim(),
        art:            art             || null,
        gruendungsjahr: gruendungsjahr  ? parseInt(gruendungsjahr)  : null,
        aufloesungsjahr: aufloesungsjahr ? parseInt(aufloesungsjahr) : null,
        untertitel:     beschreibung.trim() || null,
      }
    }

    const { data, error: err } = await supabase.from('projects').insert(payload).select('id').single()
    setSaving(false)
    if (err || !data) { setError(err?.message ?? 'Fehler beim Erstellen.'); return }

    // Also create a books record so existing components work
    await supabase.from('books').insert({
      id:         data.id,
      owner_id:   user.id,
      title:      payload.titel as string,
      project_id: data.id,
    })

    window.location.href = `/projekte/${data.id}/zeitstrahl`
  }

  const selected = TYPEN.find(t => t.key === typ)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F2F2F7' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center px-6 py-4 bg-white border-b border-gray-100 gap-4">
        <button
          onClick={() => step === 2 ? setStep(1) : router.push('/dashboard')}
          className="font-sans text-[15px] text-gray-500 flex items-center gap-1 active:opacity-60"
        >
          <span className="text-[20px]">‹</span> {step === 2 ? 'Zurück' : 'Dashboard'}
        </button>
        <Logo variant="text" height={22} />
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {step === 1 ? (
          <>
            <h1 className="font-serif font-bold text-gray-900 mb-2 leading-tight" style={{ fontSize: 28 }}>
              Neues Erinnerungsbuch
            </h1>
            <p className="font-sans text-[14px] mb-10" style={{ color: '#9B9B9B' }}>
              Worum geht es?
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              {TYPEN.map((t) => {
                const active = typ === t.key
                return (
                  <button
                    key={t.key}
                    onClick={() => handleTypSelect(t.key)}
                    style={{
                      border:       active ? '2px solid #000' : '1.5px solid rgba(0,0,0,0.08)',
                      background:   active ? '#F8F8F8' : '#fff',
                      borderRadius: 18,
                      padding:      '28px 20px',
                      textAlign:    'center',
                      cursor:       'pointer',
                      transition:   'all 150ms ease',
                    }}
                  >
                    <p style={{ fontSize: 40, marginBottom: 12 }}>{t.icon}</p>
                    <p className="font-serif font-bold" style={{ fontSize: 20, marginBottom: 8 }}>{t.titel}</p>
                    <p className="font-sans" style={{ fontSize: 13, color: '#707070', lineHeight: 1.55 }}>{t.text}</p>
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <form onSubmit={handleCreate} className="flex flex-col gap-5">
            <div className="flex items-center gap-3 mb-2">
              <span style={{ fontSize: 32 }}>{selected?.icon}</span>
              <h1 className="font-serif font-bold text-[24px] text-gray-900">{selected?.titel}</h1>
            </div>

            {error && <p className="font-sans text-[13px]" style={{ color: '#FF3B30' }}>{error}</p>}

            {typ === 'person' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Vorname *</label>
                    <input type="text" value={vorname} onChange={(e) => setVorname(e.target.value)} placeholder="z.B. Piet" required className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Nachname *</label>
                    <input type="text" value={nachname} onChange={(e) => setNachname(e.target.value)} placeholder="z.B. Mutsaers" required className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Geburtsdatum *</label>
                    <input type="date" value={geburtsdatum} onChange={(e) => setGeburtsdatum(e.target.value)} required className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Geburtsort</label>
                    <input type="text" value={geburtsort} onChange={(e) => setGeburtsort(e.target.value)} placeholder="z.B. Tilburg" className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Sterbedatum</label>
                    <input type="date" value={sterbedatum} onChange={(e) => setSterbedatum(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Sterbeort</label>
                    <input type="text" value={sterbeort} onChange={(e) => setSterbeort(e.target.value)} placeholder="z.B. Osnabrück" className={inputCls} />
                  </div>
                </div>
              </>
            )}

            {typ === 'organisation' && (
              <>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Name *</label>
                  <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="z.B. Bedford GmbH" required className={inputCls} />
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Auflösungsjahr</label>
                    <input type="number" value={aufloesungsjahr} onChange={(e) => setAufloesungsjahr(e.target.value)} placeholder="z.B. 2010" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">Kurzbeschreibung</label>
                  <textarea value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} placeholder="Was macht / machte diese Organisation besonders?" className={`${inputCls} resize-none`} style={{ minHeight: 80 }} />
                </div>
              </>
            )}

            <button type="submit" disabled={saving}
              className="w-full py-4 rounded-[14px] bg-gray-900 text-white font-sans font-semibold text-[16px] mt-2 disabled:opacity-40">
              {saving ? 'Wird erstellt …' : 'Erinnerungsbuch erstellen →'}
            </button>
          </form>
        )}
      </main>
    </div>
  )
}
