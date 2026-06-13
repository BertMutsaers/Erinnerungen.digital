import { redirect } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { createSupabaseServer } from '@/lib/supabase-server'
import GalerieCard, { type GalerieEntry } from '@/components/GalerieCard'

export default async function HomePage() {
  // Logged-in users go straight to the dashboard
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  // Galerie-Vorschau — erste freigegebene Erinnerungsbücher (SECURITY DEFINER RPC)
  const { data: galerieData } = await supabase.rpc('get_galerie_entries')
  // Vier älteste (zuerst angelegte) Erinnerungsbücher aus der Galerie
  const galeriePreview: GalerieEntry[] = [...((galerieData ?? []) as GalerieEntry[])]
    .sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))
    .slice(0, 4)

  return (
    <div className="font-sans" style={{ backgroundColor: '#fff', color: '#000' }}>

      {/* ── Sticky Nav ─────────────────────────────────────────────── */}
      <nav style={{
        position:       'sticky', top: 0, zIndex: 50,
        background:     'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)',
        borderBottom:   '1px solid rgba(0,0,0,0.06)',
        height:         60,
        display:        'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding:        '0 clamp(20px, 5vw, 40px)',
      }}>
        {/* Symbol links */}
        <Link href="/" aria-label="Startseite" style={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <Logo variant="symbol" height={32} />
        </Link>

        {/* Logo-Text zentriert — nur Mobile */}
        <Link
          href="/"
          aria-label="Startseite"
          className="sm:hidden"
          style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
        >
          <Logo variant="text" height={22} />
        </Link>

        {/* Anmelden-Button rechts */}
        <Link href="/auth"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 18px', borderRadius: 100,
            border: '1.5px solid rgba(0,0,0,0.15)',
            fontSize: 14, fontWeight: 500, color: '#000', textDecoration: 'none',
            position: 'relative', zIndex: 1,
          }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          Anmelden
        </Link>
      </nav>

      {/* ── SECTION 1: Hero ────────────────────────────────────────── */}
      <section style={{
        display:        'flex', flexDirection: 'column',
        alignItems:     'center', justifyContent: 'flex-start',
        textAlign:      'center',
        padding:        'clamp(40px, 8vw, 80px) 24px clamp(48px, 8vw, 88px)',
        position:       'relative',
      }}>
        <h1 className="font-serif" style={{
          fontSize:      'clamp(34px, 6vw, 72px)',
          fontWeight:    700,
          lineHeight:    1.1,
          letterSpacing: '-0.03em',
          maxWidth:      700,
          marginBottom:  'clamp(18px, 3vw, 28px)',
        }}>
          Du erinnerst dich.<br />Wir bewahren es.
        </h1>

        <p style={{
          fontSize:   'clamp(16px, 2vw, 20px)',
          color:      '#707070',
          maxWidth:   560,
          lineHeight: 1.6,
        }}>
          erinnerungen.digital bewahrt Lebensgeschichten, Firmenchroniken und besondere Momente
          — strukturiert, schön gestaltet und für immer zugänglich.
        </p>
      </section>

      {/* ── SECTION 2: Aufbau eines Erinnerungsbuchs ───────────────── */}
      <section style={{ padding: 'clamp(64px, 9vw, 100px) 24px', textAlign: 'center', background: '#F2F2F7' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 className="font-serif" style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 'clamp(32px, 5vw, 48px)' }}>
            Dein Erinnerungsbuch setzt sich aus drei Teilen zusammen
          </h2>

          {/* Grafik — Erinnerungsbuch-Widget */}
          <div style={{
            maxWidth: 540, margin: '0 auto',
            borderRadius: 20, overflow: 'hidden',
            border: '1px solid rgba(0,0,0,0.10)',
            boxShadow: '0 6px 28px rgba(0,0,0,0.07)',
          }}>
            {/* Header */}
            <div style={{ background: '#1C1C1E', color: '#fff', padding: '15px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <span className="font-sans" style={{ fontSize: 16, fontWeight: 600 }}>Mein Erinnerungsbuch</span>
            </div>

            {/* Drei Spalten */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', background: '#fff' }}>
              {[
                {
                  label: 'Zeitstrahl',
                  icon: (<><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 16 14" /></>),
                },
                {
                  label: 'Geschichten',
                  icon: (<><path d="M2 4h7a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H2z" /><path d="M22 4h-7a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5H22z" /></>),
                },
                {
                  label: 'Media',
                  icon: (<><rect x="3" y="4" width="18" height="16" rx="3" /><polygon points="10 9 15 12 10 15" fill="currentColor" stroke="none" /></>),
                },
              ].map((c, i) => (
                <div key={c.label} style={{
                  padding: 'clamp(20px, 4vw, 32px) 8px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                  borderLeft: i === 0 ? 'none' : '1px solid rgba(0,0,0,0.07)',
                }}>
                  <span style={{
                    width: 52, height: 52, borderRadius: '50%', background: '#F2F2F0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3C3C3E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      {c.icon}
                    </svg>
                  </span>
                  <span className="font-sans" style={{ fontSize: 'clamp(13px, 2.4vw, 15px)', color: '#1C1C1E', fontWeight: 500 }}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Erklärzeilen */}
          <div style={{ maxWidth: 520, margin: 'clamp(28px, 4vw, 40px) auto 0', textAlign: 'left' }}>
            {[
              { t: 'Zeitstrahl',   d: 'Daten, Orte und Meilensteine in chronologischer Reihenfolge' },
              { t: 'Geschichten',  d: 'Erzählungen, Anekdoten und Erinnerungen in Worten' },
              { t: 'Media',        d: 'Fotos, Videos und Dokumente an einem Ort' },
            ].map((r) => (
              <p key={r.t} style={{ fontSize: 14, color: '#707070', lineHeight: 1.6, marginBottom: 8 }}>
                <span style={{ color: '#1C1C1E', fontWeight: 600 }}>{r.t}</span> – {r.d}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 2b: Öffentliche Galerie ────────────────────────── */}
      <section style={{ padding: 'clamp(64px, 9vw, 100px) 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
            <h2 className="font-serif" style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              Öffentliche Galerie
            </h2>
          </div>

          {galeriePreview.length > 0 && (
            <div className="dashboard-grid" style={{ marginTop: 56 }}>
              {galeriePreview.map((entry) => (
                <GalerieCard key={entry.share_token} entry={entry} />
              ))}
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: galeriePreview.length > 0 ? 48 : 40 }}>
            <Link
              href="/galerie"
              style={{
                display:        'inline-flex', alignItems: 'center', gap: 10,
                padding:        '16px 36px',
                borderRadius:   100,
                background:     '#000',
                color:          '#fff',
                fontSize:       15, fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Zur öffentlichen Galerie →
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: Was ist es? ──────────────────────────────────── */}
      <section style={{ padding: '100px 24px', textAlign: 'center', background: '#F2F2F7' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 className="font-serif" style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            Erinnerungen verdienen<br />mehr als eine Schublade.
          </h2>
          <div style={{ maxWidth: 620, margin: '28px auto 0', fontSize: 18, lineHeight: 1.8, color: '#3C3C3E' }}>
            <p style={{ marginBottom: 20 }}>
              Fotos vergilben. Briefe verschwinden. Und die Geschichten die nur Oma kannte
              gehen mit ihr verloren.
            </p>
            <p>
              erinnerungen.digital gibt jedem Leben einen würdigen Platz. Strukturiert durch KI,
              gestaltet wie ein hochwertiges Buch — und für immer zugänglich für die die nach uns kommen.
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: Projekttypen ────────────────────────────────── */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 className="font-serif" style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 700, textAlign: 'center' }}>
            Was möchtest du bewahren?
          </h2>
          <div style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap:                 20,
            marginTop:           48,
          }}>
            {[
              { icon: '👤', titel: 'Erinnerung an Menschen', text: 'Lebensgeschichten, Biografien und Portraits. Für Eltern, Großeltern, Freunde — und für dich selbst.' },
              { icon: '🏢', titel: 'Firmenhistorie',          text: 'Die Geschichte deines Unternehmens. Von der Gründung bis heute — als Chronik für Mitarbeiter, Kunden und Nachfolger.' },
            ].map((k) => (
              <div key={k.titel} style={{ background: '#fff', borderRadius: 24, padding: '36px 32px' }}>
                <p style={{ fontSize: 48, marginBottom: 16 }}>{k.icon}</p>
                <p className="font-serif" style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>{k.titel}</p>
                <p style={{ fontSize: 15, color: '#707070', lineHeight: 1.65 }}>{k.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: So funktioniert es ─────────────────────────── */}
      <section style={{ padding: '100px 24px', background: '#F2F2F7' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <h2 className="font-serif" style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 700, textAlign: 'center', marginBottom: 64 }}>
            Einfacher als du denkst.
          </h2>
          {[
            { n: '01', titel: 'Erinnerungen eingeben',               text: 'Schreib einfach drauf los — Datum im Text genügt. Oder lade Fotos, Videos und Dokumente hoch.' },
            { n: '02', titel: 'KI strukturiert automatisch',         text: 'Unsere KI erkennt Daten, ordnet Ereignisse ein und ergänzt historischen Kontext — ganz ohne dein Zutun.' },
            { n: '03', titel: 'Schön gestaltet, für immer zugänglich', text: 'Ein Zeitstrahl, Geschichten und eine Mediathek. Wie ein hochwertiges digitales Buch.' },
          ].map((s) => (
            <div key={s.n} style={{ display: 'flex', gap: 32, marginBottom: 52, alignItems: 'flex-start' }}>
              <p className="font-serif" style={{ fontSize: 64, fontWeight: 700, color: '#E8E8E8', lineHeight: 1, flexShrink: 0, minWidth: 80 }}>{s.n}</p>
              <div style={{ paddingTop: 8 }}>
                <p className="font-serif" style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>{s.titel}</p>
                <p style={{ fontSize: 16, color: '#3C3C3E', lineHeight: 1.7 }}>{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 6: CTA ─────────────────────────────────────────── */}
      <section style={{ padding: '120px 24px', background: '#000', textAlign: 'center' }}>
        <h2 className="font-serif" style={{
          fontSize:   'clamp(28px, 5vw, 52px)',
          fontWeight: 700,
          color:      '#fff',
          maxWidth:   640,
          margin:     '0 auto',
          lineHeight: 1.15,
        }}>
          Welche Geschichte wartet darauf<br />erzählt zu werden?
        </h2>
        <Link href="/auth?tab=register"
          style={{ display: 'inline-block', marginTop: 44, padding: '16px 40px', borderRadius: 100, background: '#fff', color: '#000', fontSize: 17, fontWeight: 600, textDecoration: 'none' }}>
          Jetzt kostenlos starten
        </Link>
        <p style={{ marginTop: 16, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
          Kostenlos · Keine Kreditkarte nötig
        </p>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer style={{
        padding:        '32px 40px',
        borderTop:      '1px solid rgba(0,0,0,0.08)',
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        flexWrap:       'wrap',
        gap:            12,
      }}>
        <Logo variant="text" height={20} />
        <p style={{ fontSize: 13, color: '#707070' }}>© 2026 · Impressum · Datenschutz</p>
      </footer>

    </div>
  )
}
