'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  basePath?:          string
  zeitstrahlSuffix?:  string
}

// Inline-SVGs — einheitlicher Strich-Stil, passend zu den Icons auf der Homepage
const iconProps = {
  width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.8,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
}

function HouseIcon() {
  return (
    <svg {...iconProps} viewBox="0 0 22 22">
      <path d="M3 9.5L11 3l8 6.5V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
      <path d="M8 20V13h6v7"/>
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

export default function BottomNav({ basePath = '', zeitstrahlSuffix = '/zeitstrahl' }: Props) {
  const pathname = usePathname()

  const TABS = [
    { href: '/dashboard',                     icon: <HouseIcon />,  label: 'Dashboard'  },
    { href: `${basePath}${zeitstrahlSuffix}`, icon: <ClockIcon />,  label: 'Zeitstrahl'  },
    { href: `${basePath}/geschichten`,        icon: <BookIcon />,   label: 'Geschichten' },
    { href: `${basePath}/media`,              icon: <MediaIcon />,  label: 'Media'       },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 mx-auto max-w-[430px]">
      <div className="bg-white/85 backdrop-blur-md border-t border-gray-100">
        <div className="flex">
          {TABS.map((tab) => {
            const active = pathname === tab.href ||
                           pathname.endsWith(tab.href.split('/').pop() ?? '__never__')
            return (
              <Link key={tab.href} href={tab.href}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 font-sans transition-colors
                  ${active ? 'text-gray-900' : 'text-[#707070]'}`}>
                {tab.icon}
                <span className={`text-[10px] ${active ? 'font-bold' : 'font-medium'}`}>
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
