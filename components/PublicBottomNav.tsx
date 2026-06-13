'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

interface Props { token: string; showGalerieTab?: boolean }

// Inline-SVGs — einheitlicher Strich-Stil, passend zu den Icons auf der Homepage
const iconProps = {
  width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.8,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
}

function BackIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 8 8 12 12 16"/>
      <line x1="16" y1="12" x2="8" y2="12"/>
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9"/>
      <polyline points="12 7 12 12 16 14"/>
    </svg>
  )
}

function BookIcon() {
  return (
    <svg {...iconProps}>
      <path d="M2 4h7a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H2z"/>
      <path d="M22 4h-7a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5H22z"/>
    </svg>
  )
}

function MediaIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="4" width="18" height="16" rx="3"/>
      <polygon points="10 9 15 12 10 15" fill="currentColor" stroke="none"/>
    </svg>
  )
}

export default function PublicBottomNav({ token, showGalerieTab }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const base  = `/teilen/${token}`
  const ref   = showGalerieTab ? '?ref=galerie' : ''

  const TABS = [
    { href: `${base}${ref}`,             icon: <ClockIcon />, label: 'Zeitstrahl'  },
    { href: `${base}/geschichten${ref}`, icon: <BookIcon />,  label: 'Geschichten' },
    { href: `${base}/media${ref}`,       icon: <MediaIcon />, label: 'Media'       },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 mx-auto max-w-[430px]">
      <div className="bg-white/85 backdrop-blur-md border-t border-gray-100">
        <div className="flex">
          {/* Zurück — geht ins vorherige Fenster (z.B. Galerie), je nach Herkunft */}
          {showGalerieTab && (
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5 font-sans text-[#707070] active:opacity-60 transition-colors"
            >
              <BackIcon />
              <span className="text-[10px] font-medium">Zurück</span>
            </button>
          )}

          {TABS.map((tab) => {
            // Pfad ohne ?ref=… vergleichen; Zeitstrahl (base) auch auf Ereignis-Detailseiten aktiv
            const hrefPath = tab.href.split('?')[0]
            const active = hrefPath === base
              ? (pathname === base || pathname.startsWith(`${base}/ereignis`))
              : pathname.startsWith(hrefPath)
            return (
              <Link key={tab.href} href={tab.href}
                className="flex-1 flex flex-col items-center gap-1 py-2 font-sans">
                <span
                  className={`flex items-center justify-center rounded-full transition-colors duration-200
                    ${active ? 'bg-[#1C1C1E] text-white' : 'text-[#707070]'}`}
                  style={{ width: 46, height: 30 }}>
                  {tab.icon}
                </span>
                <span className={`text-[10px] transition-colors
                  ${active ? 'text-gray-900 font-bold' : 'text-[#707070] font-medium'}`}>
                  {tab.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
