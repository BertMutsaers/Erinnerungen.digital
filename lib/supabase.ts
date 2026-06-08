import { createBrowserClient } from '@supabase/ssr'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// createBrowserClient stores the session in cookies (readable by middleware)
// instead of localStorage (not readable server-side)
export const supabase = createBrowserClient(url, key)
