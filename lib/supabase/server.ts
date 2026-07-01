import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Server Supabase client.
 * Reads the session cookie to act as the authenticated user.
 * RLS still applies — this is NOT a service-role client.
 * Import this from Server Components and Route Handlers only.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a Server Component — safe to ignore
          }
        },
      },
    }
  )
}

/**
 * Service-role Supabase client.
 * Bypasses RLS entirely. Only for:
 *   - M-Pesa callback handler (writing payment confirmation)
 *   - Server-side subscription activation
 * NEVER import this in a Client Component or expose in a public API.
 */
export function createServiceClient() {
  const { createClient } = require('@supabase/supabase-js')

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
