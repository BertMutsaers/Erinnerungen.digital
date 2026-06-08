import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title:       'erinnerungen.digital',
  description: 'Du erinnerst dich. Wir bewahren es.',
  manifest:    '/manifest.json',
  icons: {
    icon:      '/favicon.svg',
    shortcut:  '/favicon.svg',
    apple:     '/logo-symbol.svg',
  },
  openGraph: {
    title:       'erinnerungen.digital',
    description: 'Du erinnerst dich. Wir bewahren es.',
    images:      ['/logo-full.svg'],
    type:        'website',
  },
}

export const viewport: Viewport = {
  width:        'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor:   '#FFFFFF',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="h-full">
      <body className="min-h-full bg-[#F2F2F7]">{children}</body>
    </html>
  )
}
