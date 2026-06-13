/**
 * /galerie — Öffentliche Galerie der freigegebenen Erinnerungsbücher
 *
 * Öffentlich zugänglich (kein Login erforderlich).
 * Daten werden über die SECURITY DEFINER RPC `get_galerie_entries()` geladen,
 * die ausschließlich EB mit in_galerie=true UND share_active=true zurückgibt.
 * Anon-Besucher sehen NIE private Felder (kein rohtext, kein user_id etc.).
 */

import Link from 'next/link'
import Image from 'next/image'
import { createSupabaseServer } from '@/lib/supabase-server'
import Logo from '@/components/Logo'

interface GalerieEntry {
  share_token:       string
  titel:             string
  cover_url:         string | null
  typ:               string
  geburtsdatum_jahr: number | null
  sterbedatum_jahr:  number | null
  geburtsort:        string | null
}

// ── Jahreszahl-Label ──────────────────────────────────────────────────────────
function years(entry: GalerieEntry): string {
  const { geburtsdatum_jahr: b, sterbedatum_jahr: s } = entry
  if (b && s) return `${b} – ${s}`
  if (b)      return `* ${b}`
  if (s)      return `† ${s}`
  return ''
}

// ── Einzelne Galerie-Karte ────────────────────────────────────────────────────
function GalerieCard({ entry }: { entry: GalerieEntry }) {
  const y = years(entry)

  return (
    <Link
      href={`/teilen/${entry.share_token}?ref=galerie`}
      className="group block rounded-[20px] overflow-hidden bg-white"
      style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)', textDecoration: 'none' }}
    >
      {/* Foto-Bereich */}
      <div
        className="relative flex items-center justify-center"
        style={{ height: 200, background: '#EBEBEB' }}
      >
        {entry.cover_url ? (
          <Image
            src={entry.cover_url}
            alt={entry.titel}
            fill
            className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized
          />
        ) : (
          <span style={{ fontSize: 56, opacity: 0.25 }}>
            {entry.typ === 'organisation' || entry.typ === 'firma' ? '🏛️' : '👤'}
          </span>
        )}
        {/* Leichter Schatten-Overlay für besseren Text-Kontrast */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ height: 48, background: 'linear-gradient(to top, rgba(0,0,0,0.18), transparent)' }}
        />
      </div>

      {/* Text-Bereich */}
      <div style={{ padding: '18px 22px 22px' }}>
        <p
          className="font-serif font-bold leading-tight"
          style={{ fontSize: 19, color: '#111', marginBottom: y ? 6 : 0 }}
        >
          {entry.titel}
        </p>
        {y && (
          <p
            className="font-sans"
            style={{ fontSize: 13, color: '#B0B0B0', letterSpacing: '0.02em' }}
          >
            {y}
          </p>
        )}
        {entry.geburtsort && !y && (
          <p className="font-sans" style={{ fontSize: 13, color: '#B0B0B0' }}>
            {entry.geburtsort}
          </p>
        )}
        {/* Dezenter Pfeil */}
        <p
          className="font-sans mt-4"
          style={{ fontSize: 12, color: '#CECECE', letterSpacing: '0.04em' }}
        >
          Erinnerungsbuch öffnen →
        </p>
      </div>
    </Link>
  )
}

// ── Seite ─────────────────────────────────────────────────────────────────────
export default async function GaleriePage() {
  const supabase = await createSupabaseServer()

  // SECURITY DEFINER RPC — liefert nur freigegebene EB (in_galerie + share_active)
  const { data: entries, error } = await supabase
    .rpc('get_galerie_entries')

  const list: GalerieEntry[] = (error || !entries) ? [] : entries

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: '#F2F2F7', color: '#111' }}>

      {/* Header */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100"
      >
        <Link href="/" aria-label="Startseite">
          <Logo variant="symbol" height={36} />
        </Link>
        <Link href="/" className="absolute left-1/2 -translate-x-1/2 active:opacity-60">
          <Logo variant="text" height={28} />
        </Link>
        <Link
          href="/auth"
          className="font-sans font-medium text-[14px] text-gray-900 active:opacity-60"
          style={{ padding: '8px 20px', borderRadius: 100, border: '1.5px solid rgba(0,0,0,0.15)' }}
        >
          Anmelden
        </Link>
      </header>

      {/* Seitentitel */}
      <div
        className="text-center"
        style={{ padding: '56px 24px 40px' }}
      >
        <h1
          className="font-serif"
          style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 14 }}
        >
          Öffentliche Galerie
        </h1>
        <p
          className="font-sans mx-auto"
          style={{ fontSize: 16, color: '#707070', lineHeight: 1.65, maxWidth: 500 }}
        >
          Erinnerungsbücher, die ihre Besitzer für alle zugänglich gemacht haben.
          Jedes steht für ein Leben, eine Geschichte — bewahrt für die Nachwelt.
        </p>
      </div>

      {/* Inhalt */}
      <main className="max-w-5xl mx-auto px-5 pb-20">

        {list.length === 0 ? (
          /* Leer-Zustand */
          <div
            className="flex flex-col items-center justify-center text-center mx-auto"
            style={{
              background:    '#fff',
              borderRadius:  24,
              padding:       '72px 32px',
              border:        '1.5px dashed rgba(0,0,0,0.11)',
              maxWidth:      520,
            }}
          >
            <span style={{ fontSize: 52, marginBottom: 20, opacity: 0.35 }}>📖</span>
            <p
              className="font-serif font-bold"
              style={{ fontSize: 22, color: '#111', marginBottom: 12 }}
            >
              Noch keine Einträge
            </p>
            <p
              className="font-sans"
              style={{ fontSize: 15, color: '#9B9B9B', lineHeight: 1.65, maxWidth: 340 }}
            >
              Sobald jemand ein Erinnerungsbuch für die Galerie freigibt, erscheint es hier.
            </p>
            <Link
              href="/auth?tab=register"
              className="mt-8 font-sans font-semibold text-[14px] text-white active:opacity-80"
              style={{ padding: '12px 28px', borderRadius: 100, background: '#1C1C1E', textDecoration: 'none' }}
            >
              Eigenes Erinnerungsbuch erstellen →
            </Link>
          </div>
        ) : (
          /* Karten-Grid */
          <div className="dashboard-grid">
            {list.map((entry) => (
              <GalerieCard key={entry.share_token} entry={entry} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        className="text-center font-sans"
        style={{ padding: '32px 24px', borderTop: '1px solid rgba(0,0,0,0.07)', color: '#B0B0B0', fontSize: 13 }}
      >
        <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
          erinnerungen.digital
        </Link>
        {' '}· Eigene Geschichte bewahren?{' '}
        <Link href="/auth?tab=register" style={{ color: '#555', textDecoration: 'underline' }}>
          Kostenlos starten
        </Link>
      </footer>

    </div>
  )
}
