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

const ORG_ARTEN = ['Unternehmen', 'Verein', 'Ort', 'Projekt', 'Sonstiges']

const TYPEN: { key: Typ; icon: string; titel: string; text: string }[] = [
  { key: 'person',       icon: '👤', titel: 'Person',       text: 'Lebensgeschichte, Biografie, Portrait' },
  { key: 'organisation', icon: '🏛️', titel: 'Organisation', text: 'Unternehmen, Verein, Ort, Projekt' },
]

const YEAR_RE = /\b(18|19|20)\d{2}\b/

function extractYear(text: string): number | null {
  const m = text.match(YEAR_RE)
  return m ? parseInt(m[0]) : null
}

async function parseDateKI(text: string): Promise<{ tag: number | null; monat: number | null; jahr: number | null; text: string }> {
  try {
    const res = await fetch('/api/parse-date', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    const d = await res.json()
    return { tag: d.datum_tag ?? null, monat: d.datum_monat ?? null, jahr: d.datum_jahr ?? null, text: d.datum_text ?? text }
  } catch {
    const jahr = extractYear(text)
    return { tag: null, monat: null, jahr, text }
  }
}

// ── Shared field components ───────────────────────────────────────────────
const OptLabel = () => (
  <span style={{ fontSize: 11, color: '#505050', fontStyle: 'italic', fontWeight: 400, marginLeft: 6, textTransform: 'none', letterSpacing: 0 }}>
    optional
  </span>
)

function Field({
  label, value, onChange, placeholder, required, showError, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; showError?: boolean; hint?: string
}) {
  const hasError = showError && required && !value.trim()
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {!required && <OptLabel />}
      </label>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
        style={hasError ? { borderColor: '#FF3B30' } : {}}
      />
      {hasError && <p className="font-sans text-[12px] mt-1" style={{ color: '#FF3B30' }}>Dieses Feld ist erforderlich</p>}
      {hint && !hasError && <p className="font-sans text-[12px] mt-1" style={{ color: '#707070' }}>{hint}</p>}
    </div>
  )
}

function DateField({
  label, value, onChange, required, showError, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; showError?: boolean; placeholder?: string
}) {
  const yearFound = !!extractYear(value)
  const hasError  = showError && required && !yearFound
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {!required && <OptLabel />}
      </label>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'z.B. 17. Juni 1926, Sommer 1926'}
        className={inputCls}
        style={hasError ? { borderColor: '#FF3B30' } : {}}
      />
      {hasError && (
        <p className="font-sans text-[12px] mt-1" style={{ color: '#FF3B30' }}>
          Bitte gib mindestens ein Jahr an — z.B. „1926" oder „Sommer 1926"
        </p>
      )}
      {required && !hasError && value.trim() && (
        <p className="font-sans text-[12px] mt-1" style={{ color: '#707070' }}>
          Mindestens das Jahr ist erforderlich
        </p>
      )}
      {required && !value.trim() && !showError && (
        <p className="font-sans text-[12px] mt-1" style={{ color: '#707070' }}>
          Mindestens das Jahr ist erforderlich
        </p>
      )}
    </div>
  )
}

export default function NeuesProjektPage() {
  const router = useRouter()
  const [step,      setStep]      = useState<1 | 2>(1)
  const [typ,       setTyp]       = useState<Typ | null>(null)
  const [saving,    setSaving]    = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Person
  const [vorname,        setVorname]        = useState('')
  const [nachname,       setNachname]       = useState('')
  const [geburtsort,     setGeburtsort]     = useState('')
  const [sterbeort,      setSterbeort]      = useState('')
  const [geburtsdatum,   setGeburtsdatum]   = useState('')
  const [sterbedatum,    setSterbedatum]    = useState('')

  // Organisation
  const [orgName,         setOrgName]         = useState('')
  const [art,             setArt]             = useState('')
  const [gruendungsjahr,  setGruendungsjahr]  = useState('')
  const [aufloesungsjahr, setAufloesungsjahr] = useState('')
  const [beschreibung,    setBeschreibung]    = useState('')

  const personValid = vorname.trim() && nachname.trim() && geburtsort.trim() && !!extractYear(geburtsdatum)
  const orgValid    = orgName.trim()
  const formValid   = typ === 'person' ? personValid : orgValid

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (!formValid) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); router.push('/auth'); return }

    let payload: Record<string, unknown> = { user_id: user.id, typ }

    if (typ === 'person') {
      // Parse dates with KI (non-blocking)
      const [g, s] = await Promise.all([
        geburtsdatum.trim() ? parseDateKI(geburtsdatum.trim()) : Promise.resolve({ tag: null, monat: null, jahr: null, text: '' }),
        sterbedatum.trim()  ? parseDateKI(sterbedatum.trim())  : Promise.resolve({ tag: null, monat: null, jahr: null, text: '' }),
      ])

      payload = {
        ...payload,
        titel:      `${vorname.trim()} ${nachname.trim()}`,
        vorname:    vorname.trim(),
        nachname:   nachname.trim(),
        geburtsort: geburtsort.trim(),
        sterbeort:  sterbeort.trim() || null,
        // Legacy date field (ISO)
        geburtsdatum: g.jahr ? `${g.jahr}-${String(g.monat ?? 1).padStart(2,'0')}-${String(g.tag ?? 1).padStart(2,'0')}` : null,
        sterbedatum:  s.jahr ? `${s.jahr}-${String(s.monat ?? 1).padStart(2,'0')}-${String(s.tag ?? 1).padStart(2,'0')}` : null,
        // Structured new fields
        geburtsdatum_text:  g.text  || geburtsdatum.trim() || null,
        geburtsdatum_tag:   g.tag,
        geburtsdatum_monat: g.monat,
        geburtsdatum_jahr:  g.jahr,
        sterbedatum_text:   s.text  || sterbedatum.trim()  || null,
        sterbedatum_tag:    s.tag,
        sterbedatum_monat:  s.monat,
        sterbedatum_jahr:   s.jahr,
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
    setSaving(false)
    if (error || !data) return

    // Create books record (owner_id references auth.users after migration_020)
    const { error: bookErr } = await supabase.from('books').insert({
      id: data.id, owner_id: user.id, title: payload.titel as string, project_id: data.id,
    })
    if (bookErr) console.error('Book insert failed:', bookErr.message)

    window.location.href = `/projekte/${data.id}/zeitstrahl`
  }

  const selected = TYPEN.find(t => t.key === typ)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F2F2F7' }}>
      <header className="sticky top-0 z-30 flex items-center px-6 py-4 bg-white border-b border-gray-100 gap-4">
        <button onClick={() => step === 2 ? setStep(1) : router.push('/dashboard')}
          className="font-sans text-[15px] text-gray-500 flex items-center gap-1 active:opacity-60">
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
            <p className="font-sans text-[14px] mb-10" style={{ color: '#9B9B9B' }}>Worum geht es?</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              {TYPEN.map((t) => (
                <button key={t.key} onClick={() => { setTyp(t.key); setStep(2); setSubmitted(false) }}
                  style={{ border: typ === t.key ? '2px solid #000' : '1.5px solid rgba(0,0,0,0.08)', background: typ === t.key ? '#F8F8F8' : '#fff', borderRadius: 18, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 150ms ease' }}>
                  <p style={{ fontSize: 40, marginBottom: 12 }}>{t.icon}</p>
                  <p className="font-serif font-bold" style={{ fontSize: 20, marginBottom: 8 }}>{t.titel}</p>
                  <p className="font-sans" style={{ fontSize: 13, color: '#707070', lineHeight: 1.55 }}>{t.text}</p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <form onSubmit={handleCreate} className="flex flex-col gap-5">
            <div className="flex items-center gap-3 mb-2">
              <span style={{ fontSize: 32 }}>{selected?.icon}</span>
              <h1 className="font-serif font-bold text-[24px] text-gray-900">{selected?.titel}</h1>
            </div>

            {typ === 'person' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Vorname" value={vorname} onChange={setVorname} placeholder="z.B. Piet" required showError={submitted} />
                  <Field label="Nachname" value={nachname} onChange={setNachname} placeholder="z.B. Mutsaers" required showError={submitted} />
                </div>

                <DateField
                  label="Geburtsdatum" value={geburtsdatum} onChange={setGeburtsdatum}
                  required showError={submitted}
                  placeholder="z.B. 17. Juni 1926, Sommer 1926"
                />

                <Field label="Geburtsort" value={geburtsort} onChange={setGeburtsort}
                  placeholder="z.B. Tilburg" required showError={submitted} />

                <DateField
                  label="Sterbedatum" value={sterbedatum} onChange={setSterbedatum}
                  placeholder="z.B. 3. September 1982, 1982"
                />

                <Field label="Sterbeort" value={sterbeort} onChange={setSterbeort}
                  placeholder="z.B. Osnabrück" />
              </>
            )}

            {typ === 'organisation' && (
              <>
                <Field label="Name der Organisation" value={orgName} onChange={setOrgName}
                  placeholder="z.B. Bedford GmbH" required showError={submitted} />
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
              style={{ opacity: !formValid ? 0.4 : 1, cursor: !formValid ? 'not-allowed' : 'pointer' }}
              className="w-full py-4 rounded-[14px] bg-gray-900 text-white font-sans font-semibold text-[16px] mt-2 transition-opacity">
              {saving ? 'KI analysiert Datum …' : 'Erinnerungsbuch erstellen →'}
            </button>

            {submitted && !formValid && (
              <p className="font-sans text-[13px] text-center" style={{ color: '#FF3B30' }}>
                Bitte alle Pflichtfelder ausfüllen.
              </p>
            )}
          </form>
        )}
      </main>
    </div>
  )
}
