'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import Logo from '@/components/Logo'

interface Profile { vorname?: string; nachname?: string }
interface Props   { user: User; profile: Profile | null }

export default function KontoClient({ user, profile }: Props) {
  const router = useRouter()

  const displayName =
    profile?.vorname && profile?.nachname
      ? `${profile.vorname} ${profile.nachname}`
      : profile?.vorname ?? user.email ?? ''

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/auth'
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F2F2F7' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 font-sans text-[15px] text-gray-900 active:opacity-60"
        >
          <span className="text-[20px] leading-none">‹</span>
          <span>Zurück</span>
        </button>
        <div className="absolute left-1/2 -translate-x-1/2">
          <Logo variant="text" height={30} />
        </div>
        <div style={{ width: 60 }} />
      </header>

      <main className="max-w-[430px] mx-auto px-6 py-10 flex flex-col gap-6">
        <h1 className="font-serif font-bold text-[28px] text-gray-900">Mein Konto</h1>

        {/* Account info */}
        <div className="bg-white rounded-[18px] overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          {displayName && displayName !== user.email && (
            <>
              <div className="px-5 py-4 flex justify-between items-center">
                <span className="font-sans text-[13px] text-gray-400">Name</span>
                <span className="font-sans text-[14px] text-gray-900">{displayName}</span>
              </div>
              <div className="h-px bg-gray-100 mx-5" />
            </>
          )}
          <div className="px-5 py-4 flex justify-between items-center">
            <span className="font-sans text-[13px] text-gray-400">E-Mail</span>
            <span className="font-sans text-[14px] text-gray-900">{user.email}</span>
          </div>
        </div>

        {/* Sign out */}
        <div className="bg-white rounded-[18px] overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <button
            onClick={handleSignOut}
            className="w-full px-5 py-4 text-left font-sans text-[15px] font-medium active:bg-gray-50 flex items-center gap-3"
            style={{ color: '#C0392B' }}
          >
            Abmelden
          </button>
        </div>
      </main>
    </div>
  )
}
