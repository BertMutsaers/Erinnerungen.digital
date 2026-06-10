/**
 * Etappe 1: Fundament für "Erinnerungsbuch öffentlich teilen"
 *
 * Token-Erzeugung und Besitzer-Aktionen (create / revoke / regenerate).
 * Alle schreibenden Funktionen prüfen server-seitig, dass auth.uid() = projects.user_id.
 * Die öffentliche Leseseite (Etappe 2) nutzt die SECURITY DEFINER RPCs in der DB.
 */

import { createSupabaseServer } from './supabase-server'

// ── Token generation ──────────────────────────────────────────────────────────

/**
 * Generates a cryptographically secure share token: 64 hex characters = 256 bit entropy.
 * Example: "a3f8d2e1...c4b9" — not guessable by brute force.
 */
function generateToken(): string {
  // Works in Node.js (server-side) and modern browsers
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ── Owner actions (server-side only) ─────────────────────────────────────────

/**
 * Creates a new share token for the given project.
 * Only the authenticated owner of the project may call this.
 * Returns the new token on success, throws on error / unauthorized.
 */
export async function createShareToken(projectId: string): Promise<string> {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht eingeloggt')

  const token = generateToken()
  const { error } = await supabase
    .from('projects')
    .update({ share_token: token, shared_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('user_id', user.id) // RLS guard: only owner can update

  if (error) throw new Error(error.message)
  return token
}

/**
 * Revokes the share token for the given project (sets to NULL).
 * Any existing share links become invalid immediately.
 */
export async function revokeShareToken(projectId: string): Promise<void> {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht eingeloggt')

  const { error } = await supabase
    .from('projects')
    .update({ share_token: null, shared_at: null })
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
}

/**
 * Replaces the existing share token with a new one.
 * The old link becomes invalid immediately.
 */
export async function regenerateShareToken(projectId: string): Promise<string> {
  return createShareToken(projectId)
}

/**
 * Enables sharing for a project.
 * If a token already exists, it is reused (so previously-sent links keep working).
 * If no token exists yet, a new one is generated.
 * Returns the active share token.
 */
export async function enableSharing(projectId: string): Promise<string> {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht eingeloggt')

  // Fetch existing token (if any)
  const { data: existing } = await supabase
    .from('projects')
    .select('share_token')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  const token = existing?.share_token ?? generateToken()

  const { error } = await supabase
    .from('projects')
    .update({ share_token: token, share_active: true, shared_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  return token
}

/**
 * Disables sharing without revoking the token.
 * The token is preserved so it can be re-enabled later and previously sent links
 * can be restored by turning sharing back on.
 */
export async function disableSharing(projectId: string): Promise<void> {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht eingeloggt')

  const { error } = await supabase
    .from('projects')
    .update({ share_active: false })
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
}

/**
 * Returns the current share token for a project (if any).
 * Returns null if not shared.
 */
export async function getShareToken(projectId: string): Promise<string | null> {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht eingeloggt')

  const { data, error } = await supabase
    .from('projects')
    .select('share_token')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (error) throw new Error(error.message)
  return data?.share_token ?? null
}

// ── Public read (used by the share page in Etappe 2) ─────────────────────────

/**
 * Verifies that a share token is valid and returns the project.
 * Uses the SECURITY DEFINER RPC — no auth required.
 * Returns null if token is invalid or not found.
 */
export async function getProjectByShareToken(token: string) {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .rpc('get_project_by_share_token', { p_token: token })
    .single()
  if (error || !data) return null
  return data
}
