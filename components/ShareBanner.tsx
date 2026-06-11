import Link from 'next/link'

/** Dezenter Footer für geteilte Ansichten. */
export default function ShareBanner() {
  return (
    <div
      className="flex items-center justify-center gap-2 py-4 font-sans text-[11px]"
      style={{ color: '#B0B0B0' }}
    >
      <span>Geteiltes Erinnerungsbuch</span>
      <span>·</span>
      <Link href="/" style={{ color: '#B0B0B0', textDecoration: 'none' }} className="hover:underline">
        erinnerungen.digital
      </Link>
    </div>
  )
}
