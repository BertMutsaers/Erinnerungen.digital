import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

/**
 * Auth callback handler — exchanges the PKCE code for a session server-side,
 * then redirects to the intended destination (default: /dashboard).
 *
 * Used by:
 *   - Password reset:  /auth/callback?next=/auth/reset
 *   - (future) OAuth, magic links, email confirmation
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createSupabaseServer()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  // Something went wrong — send back to /auth with an error hint
  return NextResponse.redirect(new URL('/auth?error=auth_callback_failed', origin))
}
