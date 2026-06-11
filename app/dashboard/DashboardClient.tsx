'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import Logo from '@/components/Logo'
import ProjectEditSheet from '@/components/ProjectEditSheet'
import OnboardingScreen from '@/components/OnboardingScreen'

interface Project {
  id:                  string
  titel:               string
  typ:                 string
  cover_url?:          string
  zuletzt_bearbeitet?: string
  share_token?:        string | null
  share_active?:       boolean
  vorname?:            string
  nachname?:           string
  firmenname?:         string
  geburtsdatum_text?:  string
  geburtsort?:         string
  sterbedatum_text?:   string
  sterbeort?:          string
}

interface Profile {
  vorname?:     string
  nachname?:    string
  anzeigename?: string
  avatar_url?:  string
  updated_at?:  string
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

// ── Project card with long-press ─────────────────────────────────────────
function ProjectCard({ project: p, onTap, onLongPress }: {
  project: Project; onTap: () => void; onLongPress: () => void
}) {
  const longTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pressed,  setPressed]  = useState(false)
  const tapStarted = useRef(false)

  function onPointerDown() {
    tapStarted.current = true; setPressed(true)
    longTimer.current = setTimeout(() => {
      tapStarted.current = false; setPressed(false)
      if (navigator.vibrate) navigator.vibrate(40)
      onLongPress()
    }, 500)
  }
  function onPointerUp() {
    clearTimeout(longTimer.current!)
    if (!tapStarted.current) return
    tapStarted.current = false; setPressed(false); onTap()
  }
  function onPointerLeave() {
    clearTimeout(longTimer.current!); tapStarted.current = false; setPressed(false)
  }

  const photoSrc = p.cover_url
    ? `${p.cover_url}${p.cover_url.includes('?') ? '&' : '?'}t=${p.zuletzt_bearbeitet ?? Date.now()}`
    : null

  return (
    <div onPointerDown={onPointerDown} onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave} onPointerCancel={onPointerLeave}
      className="bg-white rounded-[20px] overflow-hidden select-none"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', cursor: 'pointer',
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        transition: pressed ? 'transform 200ms ease' : 'transform 150ms ease' }}>

      {/* Photo area ~65% of card */}
      <div className="relative flex items-center justify-center" style={{ height: 160, background: '#E8E8E8' }}>
        {photoSrc
          ? <Image src={photoSrc} alt={p.titel} fill className="object-cover object-top" sizes="300px" unoptimized />
          : <span style={{ fontSize: 48 }}>{TYP_ICON[p.typ] ?? '📖'}</span>}
        {/* Shared badge — globe icon, only when share_active */}
        {p.share_active && (
          <div
            title="Öffentlich per Link geteilt"
            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </div>
        )}
      </div>

      {/* Text area — white background, black text */}
      <div style={{ padding: '16px 20px 20px', background: '#fff' }}>
        <p className="font-serif font-bold text-[20px] text-gray-900 leading-tight">{p.titel}</p>
        <p className="font-sans text-[12px] mt-2" style={{ color: '#B0B0B0' }}>
          Zuletzt bearbeitet: {relativeDate(p.zuletzt_bearbeitet)}
        </p>
      </div>
    </div>
  )
}

export default function DashboardClient({ user, projects: initialProjects, profile }: Props) {
  const router    = useRouter()
  // Onboarding: zeigen wenn kein Vorname gesetzt (neuer Nutzer)
  const [showOnboarding, setShowOnboarding] = useState(!profile?.vorname?.trim())
  // Greeting name: anzeigename → vorname → leer (kein E-Mail-Prefix mehr)
  const firstName =
    profile?.anzeigename?.trim() ||
    profile?.vorname?.trim() ||
    ''
  const [projects,       setProjects]       = useState(initialProjects)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [toast,          setToast]          = useState<string | null>(null)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  async function reloadProjects() {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return
    const { data } = await supabase.from('projects')
      .select('id, titel, typ, cover_url, zuletzt_bearbeitet, share_token, share_active, vorname, nachname, firmenname, geburtsdatum_text, geburtsort, sterbedatum_text, sterbeort')
      .eq('user_id', u.id).order('zuletzt_bearbeitet', { ascending: false })
    if (data) setProjects(data as Project[])
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  // ── Onboarding für neue Nutzer (kein Vorname gesetzt) ────────────────────
  if (showOnboarding) {
    return (
      <OnboardingScreen
        user={user}
        onDone={() => window.location.href = '/dashboard'}
      />
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F2F2F7' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <Link href="/dashboard" aria-label="Dashboard"><Logo variant="symbol" height={38} /></Link>
        <div className="absolute left-1/2 -translate-x-1/2">
          <Logo variant="text" height={30} />
        </div>

        <Link href="/konto" className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 active:opacity-70 block">
          {profile?.avatar_url ? (
            // Cache-bust with updated_at so a new avatar shows immediately
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${profile.avatar_url}${profile.avatar_url.includes('?') ? '&' : '?'}cb=${profile.updated_at ?? ''}`}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="w-full h-full rounded-full bg-gray-900 text-white font-sans font-semibold text-[13px] flex items-center justify-center">
              {initials(user.email ?? '', profile)}
            </span>
          )}
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="font-serif" style={{ fontSize: 28, fontStyle: 'italic', fontWeight: 400, color: '#111' }}>
            {greeting()}{firstName ? `, ${firstName}` : ''}.
          </h1>
          <p className="font-sans text-[14px] mt-1" style={{ color: '#9B9B9B' }}>
            {projects.length === 0
              ? 'Du hast noch keine Erinnerungsbücher.'
              : `${projects.length} ${projects.length === 1 ? 'Erinnerungsbuch' : 'Erinnerungsbücher'}`}
          </p>
        </div>

        {/* Project grid */}
        {projects.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center text-center"
            style={{ background: '#fff', borderRadius: 24, padding: '60px 32px', border: '1.5px dashed rgba(0,0,0,0.12)' }}
          >
            <span className="text-[48px] mb-4">📖</span>
            <p className="font-serif text-[20px] font-bold text-gray-900 mb-6">Dein erstes Erinnerungsbuch wartet.</p>
            <Link
              href="/projekte/neu"
              className="px-6 py-3 rounded-full bg-gray-900 text-white font-sans font-semibold text-[15px] active:opacity-80"
            >
              + Neues Erinnerungsbuch anlegen
            </Link>
          </div>
        ) : (
          <div className="dashboard-grid">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onTap={() => router.push(`/projekte/${p.id}/zeitstrahl`)}
                onLongPress={() => setEditingProject(p)}
              />
            ))}

            {/* Add new */}
            <Link
              href="/projekte/neu"
              className="flex flex-col items-center justify-center text-center"
              style={{ borderRadius: 20, border: '1.5px dashed rgba(0,0,0,0.15)', minHeight: 220, padding: 32 }}
            >
              <span className="font-serif text-[18px]" style={{ fontStyle: 'italic', color: '#B0B0B0' }}>
                + Neues Erinnerungsbuch anlegen
              </span>
            </Link>
          </div>
        )}
      </main>

      <ProjectEditSheet
        project={editingProject ? {
          ...editingProject,
          coverUrl:          editingProject.cover_url,
          shareToken:        editingProject.share_token,
          shareActive:       editingProject.share_active ?? false,
          geburtsdatumText:  editingProject.geburtsdatum_text,
          sterbedatumText:   editingProject.sterbedatum_text,
        } : null}
        onClose={() => setEditingProject(null)}
        onSaved={() => { reloadProjects(); showToast('✓ Gespeichert') }}
        onDeleted={() => { reloadProjects(); showToast('Erinnerungsbuch gelöscht') }}
        onShareChanged={reloadProjects}
      />

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[70] bg-gray-900 text-white text-[13px] font-sans px-5 py-2.5 rounded-full shadow-lg whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}

