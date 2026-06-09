'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  basePath?:          string
  zeitstrahlSuffix?:  string
}

// House icon as inline SVG — matches the monochrome style of other nav icons
function HouseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L11 3l8 6.5V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
      <path d="M8 20V13h6v7"/>
    </svg>
  )
}

export default function BottomNav({ basePath = '', zeitstrahlSuffix = '/zeitstrahl' }: Props) {
  const pathname = usePathname()

  const TABS = [
    { href: `${basePath}${zeitstrahlSuffix}`, icon: '⏱', label: 'Zeitstrahl'  },
    { href: `${basePath}/geschichten`,        icon: '📖', label: 'Geschichten' },
    { href: `${basePath}/media`,              icon: '🎬', label: 'Media'       },
    { href: '/dashboard',                     icon: null,  label: 'Dashboard'  },
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
                {tab.icon
                  ? <span className="text-xl leading-none">{tab.icon}</span>
                  : <HouseIcon />
                }
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
