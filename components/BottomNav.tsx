'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  basePath?: string  // e.g. '/projekte/[id]' — defaults to '' for legacy routes
}

export default function BottomNav({ basePath = '' }: Props) {
  const pathname = usePathname()

  const TABS = [
    { href: `${basePath}/zeitstrahl`, fallback: '/',            icon: '⏱', label: 'Zeitstrahl'  },
    { href: `${basePath}/geschichten`, fallback: '/geschichten', icon: '📖', label: 'Geschichten' },
    { href: `${basePath}/media`,       fallback: '/media',       icon: '🎬', label: 'Media'       },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 mx-auto max-w-[430px]">
      <div className="bg-white/85 backdrop-blur-md border-t border-gray-100">
        <div className="flex">
          {TABS.map((tab) => {
            const href   = tab.href || tab.fallback
            const active = pathname === href || pathname === tab.fallback ||
                           pathname.endsWith(tab.href.split('/').pop() ?? '')
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 font-sans transition-colors
                  ${active ? 'text-gray-900' : 'text-[#707070]'}`}
              >
                <span className="text-xl leading-none">{tab.icon}</span>
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
