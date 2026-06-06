import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'erinnerungen.digital',
  description: 'Deine schönsten Momente – festgehalten.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="h-full">
      <body className="min-h-full bg-[#F2F2F7]">{children}</body>
    </html>
  )
}
