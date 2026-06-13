import { redirect } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { createSupabaseServer } from '@/lib/supabase-server'

export default async function HomePage() {
  // Logged-in users go straight to the dashboard
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')
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
        padding:        '0 40px',
      }}>
        <Logo variant="symbol" height={32} />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/galerie"
            style={{ padding: '9px 22px', borderRadius: 100, fontSize: 14, fontWeight: 500, color: '#555', textDecoration: 'none' }}>
            Galerie
          </Link>
          <Link href="/auth"
            style={{ padding: '9px 22px', borderRadius: 100, border: '1.5px solid rgba(0,0,0,0.18)', fontSize: 14, fontWeight: 500, color: '#000', textDecoration: 'none' }}>
            Anmelden
          </Link>
          <Link href="/auth?tab=register"
            style={{ padding: '9px 22px', borderRadius: 100, background: '#000', color: '#fff', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
            Kostenlos starten
          </Link>
        </div>
      </nav>

      {/* ── SECTION 1: Hero ────────────────────────────────────────── */}
      <section style={{
        minHeight:      '100vh',
        display:        'flex', flexDirection: 'column',
        alignItems:     'center', justifyContent: 'center',
        textAlign:      'center',
        padding:        '80px 24px 60px',
        position:       'relative',
      }}>
        <Logo variant="full" height={80} className="mb-12" />

        <h1 className="font-serif" style={{
          fontSize:      'clamp(36px, 6vw, 72px)',
          fontWeight:    700,
          lineHeight:    1.1,
          letterSpacing: '-0.03em',
          maxWidth:      700,
          marginBottom:  28,
        }}>
          Du erinnerst dich.<br />Wir bewahren es.
        </h1>

        <p style={{
          fontSize:   'clamp(16px, 2vw, 20px)',
          color:      '#707070',
          maxWidth:   560,
          lineHeight: 1.6,
          marginBottom: 44,
        }}>
          erinnerungen.digital bewahrt Lebensgeschichten, Firmenchroniken und besondere Momente
          — strukturiert, schön gestaltet und für immer zugänglich.
        </p>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/auth?tab=register"
            style={{ padding: '14px 32px', borderRadius: 100, background: '#000', color: '#fff', fontSize: 16, fontWeight: 500, textDecoration: 'none' }}>
            Kostenlos starten
          </Link>
          <Link href="/auth"
            style={{ padding: '14px 32px', borderRadius: 100, border: '1.5px solid rgba(0,0,0,0.2)', color: '#000', fontSize: 16, textDecoration: 'none' }}>
            Anmelden
          </Link>
        </div>
        <Link href="/demo" style={{ marginTop: 20, fontSize: 14, color: '#707070', textDecoration: 'none' }}>
          oder Demo ansehen →
        </Link>

        {/* Scroll hint */}
        <div style={{ position: 'absolute', bottom: 32, fontSize: 20, color: 'rgba(0,0,0,0.25)', animation: 'bounce 2s infinite' }}>↓</div>
      </section>

      {/* ── SECTION 2: Was ist es? ──────────────────────────────────── */}
      <section style={{ padding: '100px 24px', textAlign: 'center' }}>
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

      {/* ── SECTION 3: Projekttypen ────────────────────────────────── */}
      <section style={{ padding: '80px 24px', background: '#F2F2F7' }}>
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
              { icon: '📖', titel: 'Sonstige Historie',       text: 'Vereine, Orte, Ereignisse oder besondere Projekte. Alles was eine Geschichte hat verdient es bewahrt zu werden.' },
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

      {/* ── SECTION 4: So funktioniert es ─────────────────────────── */}
      <section style={{ padding: '100px 24px' }}>
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

      {/* ── SECTION 4b: Demo ───────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', background: '#F2F2F7', textAlign: 'center' }}>
        <h2 className="font-serif" style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 700, marginBottom: 16 }}>
          Sieh selbst — ein echtes Beispiel
        </h2>
        <p style={{ fontSize: 16, color: '#707070', marginBottom: 40, lineHeight: 1.6 }}>
          Der Lebenskreis von Piet Mutsaers (1926–1982)<br />— erstellt mit erinnerungen.digital
        </p>
        <Link
          href="/demo"
          style={{
            display:        'inline-flex', alignItems: 'center', gap: 10,
            padding:        '18px 36px',
            borderRadius:   16,
            background:     '#fff',
            color:          '#000',
            fontSize:       16, fontWeight: 600,
            textDecoration: 'none',
            boxShadow:      '0 4px 20px rgba(0,0,0,0.1)',
          }}
        >
          <span style={{ fontSize: 24 }}>👁️</span>
          Demo öffnen — Piet Mutsaers
        </Link>
        <p style={{ marginTop: 14, fontSize: 13, color: '#B0B0B0' }}>
          Lese-Modus · Keine Registrierung nötig
        </p>
      </section>

      {/* ── SECTION 5: Galerie-Teaser ──────────────────────────────── */}
      <section style={{ padding: '100px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 className="font-serif" style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 16 }}>
            Geschichten, die geteilt werden.
          </h2>
          <p style={{ fontSize: 17, color: '#707070', lineHeight: 1.7, marginBottom: 40 }}>
            Manche Erinnerungsbücher sind für alle da — von Familien, die ihre Geschichte
            der Welt zeigen möchten. Entdecke öffentlich geteilte Erinnerungsbücher in unserer Galerie.
          </p>
          <Link
            href="/galerie"
            style={{
              display:        'inline-flex', alignItems: 'center', gap: 10,
              padding:        '16px 36px',
              borderRadius:   100,
              border:         '1.5px solid rgba(0,0,0,0.15)',
              color:          '#000',
              fontSize:       15, fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Zur öffentlichen Galerie →
          </Link>
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
