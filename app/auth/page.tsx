'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/Logo'

const inputCls = `w-full px-4 py-3 rounded-[12px] font-sans text-[16px] text-gray-900
  bg-white outline-none transition-colors
  border border-[rgba(0,0,0,0.1)] placeholder-gray-400
  focus:border-black`

const RESEND_COOLDOWN_S = 60

function AuthForm() {
  const searchParams = useSearchParams()
  const redirectTo   = searchParams.get('redirect') ?? '/dashboard'
  const initialTab   = searchParams.get('tab') === 'register' ? 'register' : 'login'

  type Tab = 'login' | 'register' | 'forgot' | 'confirmed'
  const [tab,       setTab]       = useState<Tab>(initialTab)
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [password2, setPassword2] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [info,      setInfo]      = useState<string | null>(null)

  // Resend cooldown
  const [resendCooldown, setResendCooldown] = useState(0)
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  // Detect ?confirmed=1 (user landed here after clicking confirmation link but no session yet)
  useEffect(() => {
    if (searchParams.get('confirmed') === '1') {
      setInfo('✓ E-Mail bestätigt — du kannst dich jetzt anmelden.')
    }
  }, [searchParams])

  function reset(nextTab: Tab) {
    setTab(nextTab); setError(null); setInfo(null)
  }

  // ── Login ────────────────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) {
      // Supabase returns "Email not confirmed" when confirmation is pending
      if (err.message.toLowerCase().includes('not confirmed') ||
          err.message.toLowerCase().includes('email') && err.message.toLowerCase().includes('confirm')) {
        setError('Deine E-Mail-Adresse ist noch nicht bestätigt. Bitte klicke auf den Bestätigungslink in der E-Mail.')
      } else {
        setError('Falsche E-Mail oder Passwort.')
      }
      return
    }
    window.location.href = redirectTo
  }

  // ── Register ─────────────────────────────────────────────────────────
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== password2) { setError('Passwörter stimmen nicht überein.'); return }
    if (password.length < 8)    { setError('Passwort muss mindestens 8 Zeichen haben.'); return }
    setLoading(true)
    const origin = window.location.origin
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // After clicking confirmation link: exchange code → redirect to dashboard
        emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      },
    })
    setLoading(false)
    if (err) { setError(err.message); return }

    if (data.session) {
      // Email confirmation disabled — user is immediately logged in
      window.location.href = redirectTo
    } else {
      // Email confirmation required — show confirmation screen
      setTab('confirmed')
      setResendCooldown(RESEND_COOLDOWN_S)
    }
  }

  // ── Resend confirmation email ─────────────────────────────────────────
  async function handleResend() {
    if (resendCooldown > 0) return
    setError(null)
    const origin = window.location.origin
    const { error: err } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${origin}/auth/callback?next=/dashboard` },
    })
    if (err) { setError(err.message); return }
    setResendCooldown(RESEND_COOLDOWN_S)
    setInfo('Bestätigungs-E-Mail erneut gesendet.')
  }

  // ── Forgot password ───────────────────────────────────────────────────
  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (!email) { setError('Bitte E-Mail-Adresse eingeben.'); return }
    setLoading(true)
    const origin = window.location.origin
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/auth/reset`,
    })
    setLoading(false)
    if (resetErr) { setError(resetErr.message); return }
    setInfo('Falls ein Konto mit dieser E-Mail existiert, haben wir dir einen Reset-Link geschickt. Bitte prüfe deinen Posteingang (ggf. auch Spam).')
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div
      className="w-full flex flex-col"
      style={{ maxWidth: 400, background: '#fff', borderRadius: 24, padding: '40px 36px', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}
    >
      <div className="flex flex-col items-center mb-8 gap-2">
        <Logo variant="full" height={60} />
      </div>

      {/* Tab bar — hidden on forgot/confirmed screens */}
      {(tab === 'login' || tab === 'register') && (
        <div className="flex border-b border-gray-100 mb-7">
          {(['login', 'register'] as const).map((t) => (
            <button
              key={t}
              onClick={() => reset(t)}
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
      )}

      {error && (
        <p className="font-sans text-[13px] mb-4 text-center leading-relaxed" style={{ color: '#FF3B30' }}>{error}</p>
      )}
      {info && (
        <p className="font-sans text-[13px] mb-4 text-center leading-relaxed" style={{ color: '#3A7D44' }}>{info}</p>
      )}

      {/* ── Login ── */}
      {tab === 'login' && (
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input type="email"    value={email}    onChange={(e) => setEmail(e.target.value)}    placeholder="E-Mail"    required className={inputCls} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Passwort" required className={inputCls} />
          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-[12px] bg-gray-900 text-white font-sans font-semibold text-[16px] mt-1 disabled:opacity-50">
            {loading ? 'Wird angemeldet …' : 'Anmelden'}
          </button>
          <p className="font-sans text-[13px] text-center mt-1" style={{ color: '#9B9B9B' }}>
            <button type="button" className="underline active:opacity-60"
              onClick={() => reset('forgot')}>
              Passwort vergessen?
            </button>
          </p>
        </form>
      )}

      {/* ── Register ── */}
      {tab === 'register' && (
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

      {/* ── Confirmed (post-registration) ── */}
      {tab === 'confirmed' && (
        <div className="flex flex-col gap-4">
          <p className="font-serif font-bold text-[22px] text-gray-900 text-center leading-tight">Fast geschafft!</p>
          <p className="font-sans text-[14px] text-center leading-relaxed" style={{ color: '#3C3C3E' }}>
            Wir haben eine Bestätigungs-E-Mail an<br />
            <strong>{email}</strong><br />
            geschickt. Bitte klicke auf den Link in der E-Mail, um dein Konto zu aktivieren.
          </p>
          <p className="font-sans text-[12px] text-center leading-relaxed" style={{ color: '#9B9B9B' }}>
            Keine E-Mail erhalten? Prüfe auch deinen Spam-Ordner.
          </p>
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="w-full py-3 rounded-[12px] font-sans font-semibold text-[14px] disabled:opacity-40 transition-opacity"
            style={{ background: '#F2F2F7', color: '#3C3C3E' }}
          >
            {resendCooldown > 0
              ? `E-Mail erneut senden (${resendCooldown} s)`
              : 'E-Mail erneut senden'}
          </button>
          <button
            onClick={() => reset('login')}
            className="font-sans text-[13px] text-center underline active:opacity-60"
            style={{ color: '#9B9B9B' }}
          >
            Zurück zum Login
          </button>
        </div>
      )}

      {/* ── Forgot password ── */}
      {tab === 'forgot' && (
        <form onSubmit={handleForgot} className="flex flex-col gap-3">
          <p className="font-serif font-bold text-[20px] text-gray-900 mb-1">Passwort zurücksetzen</p>
          <p className="font-sans text-[13px] mb-2 leading-relaxed" style={{ color: '#9B9B9B' }}>
            Gib deine E-Mail-Adresse ein. Wir schicken dir einen Link zum Zurücksetzen deines Passworts.
          </p>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-Mail" required className={inputCls} />
          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-[12px] bg-gray-900 text-white font-sans font-semibold text-[16px] mt-1 disabled:opacity-50">
            {loading ? 'Wird gesendet …' : 'Reset-Link senden'}
          </button>
          <p className="font-sans text-[13px] text-center mt-1" style={{ color: '#9B9B9B' }}>
            <button type="button" className="underline active:opacity-60"
              onClick={() => reset('login')}>
              Zurück zum Login
            </button>
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
