'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/',            icon: '⏱', label: 'Zeitstrahl'  },
  { href: '/geschichten', icon: '📖', label: 'Geschichten' },
  { href: '/media',       icon: '🎬', label: 'Media'       },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 mx-auto max-w-[430px]">
      <div className="bg-white/85 backdrop-blur-md border-t border-gray-100">
        <div className="flex">
          {TABS.map((tab) => {
            const active = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
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
