'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

/** Dezenter Footer für geteilte Ansichten. */
export default function ShareBanner() {
  const searchParams = useSearchParams()
  const fromGalerie  = searchParams.get('ref') === 'galerie'

  return (
    <div
      className="flex items-center justify-center gap-2 py-4 font-sans text-[11px]"
      style={{ color: '#B0B0B0' }}
    >
      {fromGalerie && (
        <>
          <Link href="/galerie" style={{ color: '#B0B0B0', textDecoration: 'none' }} className="hover:underline">
            ← Zurück zur Galerie
          </Link>
          <span>·</span>
        </>
      )}
      <span>Geteiltes Erinnerungsbuch</span>
      <span>·</span>
      <Link href="/" style={{ color: '#B0B0B0', textDecoration: 'none' }} className="hover:underline">
        erinnerungen.digital
      </Link>
    </div>
  )
}
