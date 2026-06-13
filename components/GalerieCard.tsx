import Link from 'next/link'
import Image from 'next/image'

export interface GalerieEntry {
  share_token:       string
  titel:             string
  cover_url:         string | null
  typ:               string
  geburtsdatum_jahr: number | null
  sterbedatum_jahr:  number | null
  geburtsort:        string | null
  created_at?:       string
}

// ── Jahreszahl-Label ──────────────────────────────────────────────────────────
export function galerieYears(entry: GalerieEntry): string {
  const { geburtsdatum_jahr: b, sterbedatum_jahr: s } = entry
  if (b && s) return `${b} – ${s}`
  if (b)      return `* ${b}`
  if (s)      return `† ${s}`
  return ''
}

// ── Einzelne Galerie-Karte ────────────────────────────────────────────────────
export default function GalerieCard({ entry }: { entry: GalerieEntry }) {
  const y = galerieYears(entry)

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
