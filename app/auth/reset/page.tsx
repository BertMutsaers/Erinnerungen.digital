'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/Logo'

const inputCls = `w-full px-4 py-3 rounded-[12px] font-sans text-[16px] text-gray-900
  bg-white outline-none transition-colors
  border border-[rgba(0,0,0,0.1)] placeholder-gray-400
  focus:border-black`

function ResetForm() {
  useSearchParams() // needed inside Suspense boundary
  const nav          = useRouter()
  const [password,   setPassword]   = useState('')
  const [password2,  setPassword2]  = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [success,    setSuccess]    = useState(false)
  const [ready,      setReady]      = useState(false)

  useEffect(() => {
    // The callback route (/auth/callback) already exchanged the code server-side
    // and set the session in cookies — we just need to verify the session exists.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setReady(true); return }
      // Fallback: listen for auth state changes (e.g. implicit-flow recovery token)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true)
      })
      return () => subscription.unsubscribe()
    })
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== password2) { setError('Passwörter stimmen nicht überein.'); return }
    if (password.length < 8)    { setError('Passwort muss mindestens 8 Zeichen haben.'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSuccess(true)
    setTimeout(() => nav.push('/dashboard'), 2500)
  }

  return (
    <div
      className="w-full flex flex-col"
      style={{ maxWidth: 400, background: '#fff', borderRadius: 24, padding: '40px 36px', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}
    >
      <div className="flex flex-col items-center mb-8 gap-2">
        <Logo variant="full" height={60} />
      </div>

      <p className="font-serif font-bold text-[22px] text-gray-900 mb-2 text-center">Neues Passwort</p>

      {success ? (
        <div className="text-center flex flex-col gap-3 mt-4">
          <p className="font-sans text-[15px]" style={{ color: '#3A7D44' }}>✓ Passwort erfolgreich geändert.</p>
          <p className="font-sans text-[13px]" style={{ color: '#9B9B9B' }}>Du wirst gleich zum Dashboard weitergeleitet …</p>
        </div>
      ) : !ready ? (
        <div className="text-center mt-4">
          <p className="font-sans text-[14px]" style={{ color: '#9B9B9B' }}>
            Warte auf Bestätigung des Reset-Links …
          </p>
          <p className="font-sans text-[12px] mt-3 leading-relaxed" style={{ color: '#C0C0C0' }}>
            Hast du den Link direkt aus der E-Mail geöffnet? Falls nicht, öffne bitte den Link in der E-Mail erneut.
          </p>
        </div>
      ) : (
        <form onSubmit={handleReset} className="flex flex-col gap-3 mt-2">
          {error && (
            <p className="font-sans text-[13px] mb-1 text-center" style={{ color: '#FF3B30' }}>{error}</p>
          )}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Neues Passwort (min. 8 Zeichen)"
            required
            className={inputCls}
            autoFocus
          />
          <input
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            placeholder="Passwort bestätigen"
            required
            className={inputCls}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-[12px] bg-gray-900 text-white font-sans font-semibold text-[16px] mt-1 disabled:opacity-50"
          >
            {loading ? 'Wird gespeichert …' : 'Passwort speichern'}
          </button>
        </form>
      )}
    </div>
  )
}

export default function ResetPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F2F2F7' }}>
      <Suspense fallback={<div className="w-[400px] h-[300px] bg-white rounded-[24px]" />}>
        <ResetForm />
      </Suspense>
    </main>
  )
}
