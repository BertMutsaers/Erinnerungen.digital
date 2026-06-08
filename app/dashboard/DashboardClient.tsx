'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import Logo from '@/components/Logo'

interface Project {
  id:                  string
  titel:               string
  typ:                 string
  cover_url?:          string
  zuletzt_bearbeitet?: string
  vorname?:            string
  nachname?:           string
  firmenname?:         string
}

interface Profile {
  vorname?: string
  nachname?: string
}

interface Props {
  user:     User
  projects: Project[]
  profile:  Profile | null
}

const TYP_LABEL: Record<string, string> = {
  person:       'Person',
  organisation: 'Organisation',
  mensch:       'Person',
  firma:        'Organisation',
  sonstiges:    'Organisation',
}

const TYP_ICON: Record<string, string> = {
  person:       '👤',
  organisation: '🏛️',
  mensch:       '👤',
  firma:        '🏛️',
  sonstiges:    '🏛️',
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Guten Morgen'
  if (h < 18) return 'Guten Tag'
  return 'Guten Abend'
}

function initials(email: string, profile: Profile | null) {
  if (profile?.vorname && profile?.nachname)
    return (profile.vorname[0] + profile.nachname[0]).toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

function relativeDate(iso?: string) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'heute'
  if (days === 1) return 'gestern'
  if (days < 7)  return `vor ${days} Tagen`
  return new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
}

export default function DashboardClient({ user, projects, profile }: Props) {
  const router = useRouter()
  const firstName = profile?.vorname ?? user.email?.split('@')[0] ?? ''

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/auth'
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F2F2F7' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <Logo variant="text" height={28} />

        <div className="relative group">
          <button className="w-9 h-9 rounded-full bg-gray-900 text-white font-sans font-semibold text-[13px] flex items-center justify-center">
            {initials(user.email ?? '', profile)}
          </button>
          {/* Dropdown */}
          <div className="absolute right-0 top-11 w-44 bg-white rounded-[14px] shadow-lg border border-gray-100 py-1 hidden group-focus-within:block">
            <Link href="/konto" className="block px-4 py-2.5 font-sans text-[14px] text-gray-700 hover:bg-gray-50">
              Mein Konto
            </Link>
            <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 font-sans text-[14px] text-red-500 hover:bg-gray-50">
              Abmelden
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="font-serif" style={{ fontSize: 28, fontStyle: 'italic', fontWeight: 400, color: '#111' }}>
            {greeting()}{firstName ? `, ${firstName}` : ''}.
          </h1>
          <p className="font-sans text-[14px] mt-1" style={{ color: '#9B9B9B' }}>
            {projects.length === 0
              ? 'Du hast noch keine Projekte.'
              : `${projects.length} ${projects.length === 1 ? 'Projekt' : 'Projekte'}`}
          </p>
        </div>

        {/* Project grid */}
        {projects.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center text-center"
            style={{ background: '#fff', borderRadius: 24, padding: '60px 32px', border: '1.5px dashed rgba(0,0,0,0.12)' }}
          >
            <span className="text-[48px] mb-4">📖</span>
            <p className="font-serif text-[20px] font-bold text-gray-900 mb-6">Dein erstes Projekt wartet.</p>
            <Link
              href="/projekte/neu"
              className="px-6 py-3 rounded-full bg-gray-900 text-white font-sans font-semibold text-[15px] active:opacity-80"
            >
              + Neues Projekt anlegen
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projekte/${p.id}/zeitstrahl`}
                className="block bg-white rounded-[20px] overflow-hidden hover:scale-[1.02] transition-transform"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
              >
                {/* Cover */}
                <div className="relative flex items-center justify-center" style={{ height: 160, background: '#F2F2F7' }}>
                  {p.cover_url ? (
                    <Image src={p.cover_url} alt={p.titel} fill className="object-cover" sizes="300px" unoptimized />
                  ) : (
                    <span style={{ fontSize: 48 }}>{TYP_ICON[p.typ] ?? '📖'}</span>
                  )}
                </div>
                {/* Info */}
                <div style={{ padding: '16px 20px 20px' }}>
                  <p className="font-sans text-[10px] uppercase tracking-widest mb-1.5" style={{ color: '#9B9B9B' }}>
                    {TYP_LABEL[p.typ] ?? p.typ}
                  </p>
                  <p className="font-serif font-bold text-[20px] text-gray-900 leading-tight">{p.titel}</p>
                  <p className="font-sans text-[12px] mt-2" style={{ color: '#B0B0B0' }}>
                    Zuletzt bearbeitet: {relativeDate(p.zuletzt_bearbeitet)}
                  </p>
                </div>
              </Link>
            ))}

            {/* Add new */}
            <Link
              href="/projekte/neu"
              className="flex flex-col items-center justify-center text-center"
              style={{ borderRadius: 20, border: '1.5px dashed rgba(0,0,0,0.15)', minHeight: 220, padding: 32 }}
            >
              <span className="font-serif text-[18px]" style={{ fontStyle: 'italic', color: '#B0B0B0' }}>
                + Neues Projekt anlegen
              </span>
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
