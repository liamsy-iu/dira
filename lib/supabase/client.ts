import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser Supabase client.
 * Uses the anon key — RLS enforces all access rules.
 * Import this from Client Components only.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
