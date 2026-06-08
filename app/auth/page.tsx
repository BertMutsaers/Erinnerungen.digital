'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/Logo'

const inputCls = `w-full px-4 py-3 rounded-[12px] font-sans text-[16px] text-gray-900
  bg-white outline-none transition-colors
  border border-[rgba(0,0,0,0.1)] placeholder-gray-400
  focus:border-black`

function AuthForm() {
  const searchParams = useSearchParams()
  const redirect     = searchParams.get('redirect') ?? '/dashboard'

  const [tab,       setTab]       = useState<'login' | 'register'>('login')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [password2, setPassword2] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) { setError('Falsche E-Mail oder Passwort.'); return }
    window.location.href = redirect
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== password2) { setError('Passwörter stimmen nicht überein.'); return }
    if (password.length < 8)    { setError('Passwort muss mindestens 8 Zeichen haben.'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (err) { setError(err.message); return }
    window.location.href = redirect
  }

  return (
    <div
      className="w-full flex flex-col"
      style={{ maxWidth: 400, background: '#fff', borderRadius: 24, padding: '40px 36px', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}
    >
      <div className="flex flex-col items-center mb-8 gap-2">
        <Logo variant="full" height={60} />
      </div>

      <div className="flex border-b border-gray-100 mb-7">
        {(['login', 'register'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(null) }}
            className="flex-1 pb-2.5 font-sans text-[15px] font-medium transition-colors"
            style={{
              color:        tab === t ? '#000' : '#9B9B9B',
              borderBottom: tab === t ? '2px solid #000' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t === 'login' ? 'Anmelden' : 'Registrieren'}
          </button>
        ))}
      </div>

      {error && (
        <p className="font-sans text-[13px] mb-4 text-center" style={{ color: '#FF3B30' }}>{error}</p>
      )}

      {tab === 'login' ? (
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input type="email"    value={email}    onChange={(e) => setEmail(e.target.value)}    placeholder="E-Mail"    required className={inputCls} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Passwort" required className={inputCls} />
          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-[12px] bg-gray-900 text-white font-sans font-semibold text-[16px] mt-1 disabled:opacity-50">
            {loading ? 'Wird angemeldet …' : 'Anmelden'}
          </button>
          <p className="font-sans text-[13px] text-center mt-1" style={{ color: '#9B9B9B' }}>
            <button type="button" className="underline active:opacity-60">Passwort vergessen?</button>
          </p>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="flex flex-col gap-3">
          <input type="email"    value={email}     onChange={(e) => setEmail(e.target.value)}     placeholder="E-Mail"                    required className={inputCls} />
          <input type="password" value={password}  onChange={(e) => setPassword(e.target.value)}  placeholder="Passwort (min. 8 Zeichen)" required className={inputCls} />
          <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="Passwort bestätigen"       required className={inputCls} />
          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-[12px] bg-gray-900 text-white font-sans font-semibold text-[16px] mt-1 disabled:opacity-50">
            {loading ? 'Konto wird erstellt …' : 'Konto erstellen'}
          </button>
          <p className="font-sans text-[13px] text-center mt-1 leading-relaxed" style={{ color: '#9B9B9B' }}>
            Mit der Registrierung stimmst du unseren<br />Nutzungsbedingungen zu.
          </p>
        </form>
      )}
    </div>
  )
}

export default function AuthPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F2F2F7' }}>
      <Suspense fallback={<div className="w-[400px] h-[400px] bg-white rounded-[24px]" />}>
        <AuthForm />
      </Suspense>
    </main>
  )
}
