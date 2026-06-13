import { createBrowserClient } from '@supabase/ssr'

// createBrowserClient stores the session in cookies (readable by middleware)
// instead of localStorage (not readable server-side)
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
)
