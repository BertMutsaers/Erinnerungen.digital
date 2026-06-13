import { createBrowserClient } from '@supabase/ssr'

// Lazy singleton — defers creation until first use so static build doesn't
// fail when env vars are absent during pre-rendering.
let _client: ReturnType<typeof createBrowserClient> | null = null

export function getSupabase() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }
  return _client
}

// Backwards-compatible named export used throughout the app
export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
  get(_t, prop) {
    return (getSupabase() as Record<string | symbol, unknown>)[prop]
  },
})
